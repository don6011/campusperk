import { createContext, useContext, useState, ReactNode } from "react";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  studentVerified: boolean;
  isPremium: boolean;
}

interface AuthContextType {
  user: MockUser | null;
  isLoggedIn: boolean;
  isStudentVerified: boolean;
  isPremium: boolean;
  login: (email: string) => void;
  logout: () => void;
  verifyStudent: () => void;
  upgradeToPremium: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isEduEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  return domain.endsWith(".edu");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>({
    id: "u1",
    name: "Alex Johnson",
    email: "alex@mit.edu",
    studentVerified: true,
    isPremium: false,
  });

  const login = (email: string) => {
    setUser({
      id: "u1",
      name: "Alex Johnson",
      email,
      studentVerified: isEduEmail(email),
      isPremium: false,
    });
  };

  const logout = () => setUser(null);

  const verifyStudent = () => {
    if (user) {
      setUser({ ...user, studentVerified: true });
    }
  };

  const upgradeToPremium = () => {
    if (user) {
      setUser({ ...user, isPremium: true });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isStudentVerified: user?.studentVerified ?? false,
        isPremium: user?.isPremium ?? false,
        login,
        logout,
        verifyStudent,
        upgradeToPremium,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
