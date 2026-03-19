import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class SetupDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(6) password: string;
  @ApiPropertyOptional() @IsOptional() @IsString() displayName?: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() allowRegistration?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() smtpHost?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() smtpPort?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() smtpUser?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() smtpPass?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() smtpFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() appUrl?: string;
}

export class CreateInviteDto {
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() expiresInDays?: number;
}

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsIn(['admin', 'user']) role?: string;
}
