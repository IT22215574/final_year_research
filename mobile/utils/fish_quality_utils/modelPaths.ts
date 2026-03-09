// utils/modelPaths.ts

// Model files - using require for bundling
export const MODEL_FILES = {
  fishDetector: require("../../assets/models/fish_detector_1.onnx"),
  speciesClassifier: require("../../assets/models/species_classifier_1.onnx"),
  gradeClassifier: require("../../assets/models/grade_classifier_1.onnx"),
};

// Export labels directly from our types
export const LABEL_FILES = {
  fishDetector: ["fish", "non_fish"], // Array format expected by the pipeline
  speciesClassifier: [
    "flyingfish",
    "graymullet", 
    "makerel",
    "tuna",
    "whitemullet",
    "yellowfintrevally"
  ],
  gradeClassifier: ["A", "B", "C"],
};

// Fish densities for weight calculation (kg/cm³)
export const FISH_DENSITIES: Record<string, number> = {
  flyingfish: 0.00105,
  graymullet: 0.00103,
  makerel: 0.00107,
  tuna: 0.00108,
  whitemullet: 0.00102,
  yellowfintrevally: 0.00106,
  default: 0.00105
};

// Verify model paths exist (for development)
export const MODEL_PATHS = {
  fishDetector: "../../assets/models/fish_detector_1.onnx",
  speciesClassifier: "../../assets/models/species_classifier_1.onnx",
  gradeClassifier: "../../assets/models/grade_classifier_1.onnx",
};