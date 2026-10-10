/** Who is making the request: what the JWT strategy puts on `request.user`. */
export interface JwtUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

/** The public face of a person, in every API response (no password, no roles). */
export interface UserDto {
  id: string;
  name: string;
  email: string;
}
