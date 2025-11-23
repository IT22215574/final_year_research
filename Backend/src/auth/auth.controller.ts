import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import {
  SignInDto,
  CompleteSignupDto,
  RequestMobileVerificationDto,
  VerifyMobileOtpDto,
} from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.signIn(signInDto);

    const expiryDate = new Date(Date.now() + 3600000);
    response.cookie('access_token', result.token, {
      httpOnly: true,
      expires: expiryDate,
    });

    const { token, ...user } = result;
    return user;
  }

  @Post('signout')
  @HttpCode(HttpStatus.OK)
  signOut(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token');
    return { success: true, message: 'Signed out successfully' };
  }

  @Post('request-mobile-verification')
  async requestMobileVerification(
    @Body() dto: RequestMobileVerificationDto,
  ) {
    return this.authService.requestMobileVerification(dto);
  }

  @Post('verify-mobile-otp')
  async verifyMobileWithOtp(@Body() dto: VerifyMobileOtpDto) {
    return this.authService.verifyMobileWithOtp(dto);
  }

  @Post('complete-signup')
  async completeSignup(@Body() dto: CompleteSignupDto) {
    return this.authService.completeSignup(dto);
  }

  @Post('check-account')
  async checkAccountExists(@Body('emailOrPhone') emailOrPhone: string) {
    return this.authService.checkAccountExists(emailOrPhone);
  }

  @Post('send-password-reset-otp')
  async sendPasswordResetOtp(
    @Body('emailOrPhone') emailOrPhone: string,
    @Body('isEmail') isEmail: boolean,
  ) {
    return this.authService.sendPasswordResetOtp(emailOrPhone, isEmail);
  }

  @Post('verify-password-reset-otp')
  async verifyPasswordResetOtp(
    @Body('emailOrPhone') emailOrPhone: string,
    @Body('isEmail') isEmail: boolean,
    @Body('otp') otp: string,
  ) {
    return this.authService.verifyPasswordResetOtp(emailOrPhone, isEmail, otp);
  }

  @Post('reset-password')
  async resetPassword(
    @Body('resetToken') resetToken: string,
    @Body('newPassword') newPassword: string,
    @Body('confirmPassword') confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      return { success: false, message: 'Passwords do not match' };
    }

    if (newPassword.length < 6) {
      return {
        success: false,
        message: 'Password must be at least 6 characters long',
      };
    }

    return this.authService.resetPassword(resetToken, newPassword);
  }
}
