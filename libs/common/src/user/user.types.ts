export enum EUserGender {
  MALE = 'M',
  FEMALE = 'F',
  OTHERS = 'O',
  NOT_SPECIFIED = 'N',
}

export enum EUserAccountStatus {
  ACTIVE = 'A',
  BANNED = 'B',
  DEACTIVATED = 'D',
  DELETED = 'DEL',
}

export enum EPlatform {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

export enum EUserLoginProvider {
  GOOGLE = 'google',
  OTP = 'otp',
  TRUE_CALLER = 'truecaller',
  WHATSAPP = 'whatsapp',
}

export enum EUserRelationshipType {
  PARENT = 'PARENT',
  COACH = 'COACH',
  GUARDIAN = 'GUARDIAN',
  ACADEMY = 'ACADEMY',
}

export enum EParentRelationship {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  GUARDIAN = 'GUARDIAN',
}
