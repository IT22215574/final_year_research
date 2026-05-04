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
  access_token?: string;
};

export async function signIn(body: SignInBody) {
  const response = await apiFetch<
    AuthUser | { success?: boolean; data?: AuthUser }
  >("/auth/signin", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    response.data
  ) {
    return response.data;
  }

  return response as AuthUser;
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
