export type RegisterUserDto = {
    fullName: string
    email: string
    password: string
    phoneNo: string
    graduationYear: string,
    details: string,
    currentCtc?: string, 
    currentCompany?: string,
    domain: string
}

export type LoginUserDto = {
    email: string
    password: string
}

export type FindUserByNameDto = {
    fullName: string,
    page: number,
    limit: number
}

export type CreateUserInvitationDto = {
    fullName: string;
    email: string;
    phoneNo: string;
    role: string;
};