import { EUserGender } from '@app/common';

export interface ICreateUserDTO {
  email?: string | null;
  phone_number?: string | null;
  full_name: string;
  profile_pic_url?: string | null;
  timezone?: string | null;
  username: string;
  gender: EUserGender;
}
