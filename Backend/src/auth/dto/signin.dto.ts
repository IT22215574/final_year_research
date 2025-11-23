import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import {

  MinLength,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class SignInDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}


export class CompleteSignupDto {
  @IsString()
  @IsOptional()
  phone: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;


  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsOptional()
  district: string;

  @IsString()
  @IsOptional()
  zone: string;


  @IsString()
  @IsOptional()
  medium: string;


  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;
}

export class RequestMobileVerificationDto {
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class VerifyMobileOtpDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsString()
  @IsNotEmpty()
  tempUserId: string;
}
