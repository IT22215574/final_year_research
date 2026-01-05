import { apiFetch } from "@/lib/api";

export type SignInBody = {
  email: string;
  password: string;
};

export type AuthUser = {
  _id: string;
  username?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  district?: string;
  zone?: string;
  medium?: string;
  isVerified?: boolean;
  isAdmin?: boolean;
};

export async function signIn(body: SignInBody) {
  return apiFetch<AuthUser>("/auth/signin", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function signOut() {
  return apiFetch<{ success: boolean; message?: string }>("/auth/signout", {
    method: "POST",
  });
}

export type CompleteSignupBody = {
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  district: string;
  zone: string;
  medium: string;
  password: string;
};

export async function completeSignup(body: CompleteSignupBody) {
  return apiFetch<{
    success: boolean;
    message: string;
    user?: { id: string; email: string; firstName: string; username: string };
  }>("/auth/complete-signup", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
