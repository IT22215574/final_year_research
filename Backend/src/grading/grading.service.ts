import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

type PredictResult = {
  species: {
    label: string;
    class: number;
    confidence: number;
    all_probabilities?: number[];
  };
  grade: {
    label: string;
    class: number;
    confidence: number;
    all_probabilities?: number[];
  };
};

@Injectable()
export class GradingService {
  private resolvePredictScriptPath(): string {
    const envPath = process.env.MODEL_PREDICT_SCRIPT;
    if (envPath && fs.existsSync(envPath)) {
      return envPath;
    }

    const candidates = [
      // If running from Backend/
      path.resolve(process.cwd(), '..', 'model', 'fish_quality_grade', 'predict.py'),
      // If running from repo root
      path.resolve(process.cwd(), 'model', 'fish_quality_grade', 'predict.py'),
      // If running from Backend/dist/
      path.resolve(process.cwd(), '..', '..', 'model', 'fish_quality_grade', 'predict.py'),
    ];

    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) {
      throw new InternalServerErrorException(
        `Could not find predict.py. Set MODEL_PREDICT_SCRIPT to an absolute path. Tried: ${candidates.join(
          ', ',
        )}`,
      );
    }

    return found;
  }

  private async runPythonPredict(args: {
    side1Path: string;
    side2Path: string;
  }): Promise<PredictResult> {
    const python = process.env.PYTHON_PATH || 'python';
    const scriptPath = this.resolvePredictScriptPath();

    const modelPath = process.env.MODEL_PATH;

    return await new Promise((resolve, reject) => {
      const childArgs = [scriptPath, '--side1', args.side1Path, '--side2', args.side2Path];
      if (modelPath) {
        childArgs.push('--model', modelPath);
      }

      const child = spawn(python, childArgs, {
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (err) => {
        reject(
          new InternalServerErrorException(
            `Failed to start python process (${python}). ${err.message}`,
          ),
        );
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(
            new InternalServerErrorException(
              `Model inference failed (exit ${code}). ${stderr || stdout}`,
            ),
          );
          return;
        }

        try {
          // predictor prints JSON only; but we parse the last non-empty line as a fallback.
          const lastLine = stdout
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .at(-1);

          if (!lastLine) {
            throw new Error('Empty output from predictor');
          }

          const parsed = JSON.parse(lastLine) as PredictResult;
          resolve(parsed);
        } catch (e: any) {
          reject(
            new InternalServerErrorException(
              `Could not parse predictor output as JSON. stdout=${stdout} stderr=${stderr} error=${e?.message}`,
            ),
          );
        }
      });
    });
  }

  async predictFromFiles(args: { side1Path: string; side2Path: string }) {
    try {
      return await this.runPythonPredict(args);
    } catch (e: any) {
      if (e?.getStatus) throw e;
      throw new InternalServerErrorException(e?.message || 'Prediction failed');
    }
  }
}
