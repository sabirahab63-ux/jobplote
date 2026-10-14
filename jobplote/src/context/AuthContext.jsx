
import {
  createContext,
  useContext,
  useState,
} from 'react';

const Ctx = createContext(null);

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('jp_auth') || 'null'
      );
    } catch {
      localStorage.removeItem('jp_auth');
      return null;
    }
  });

  // Save only a valid login or verification response
  const login = (data) => {
    if (
      !data ||
      typeof data.token !== 'string' ||
      !data.token ||
      !data.user ||
      !data.user.id ||
      !data.user.role
    ) {
      throw new Error(
        'Invalid login response. Please try logging in again.'
      );
    }

    const session = {
      token: data.token,
      user: data.user,
    };

    localStorage.setItem(
      'jp_auth',
      JSON.stringify(session)
    );

    setAuth(session);
  };

  const logout = () => {
    localStorage.removeItem('jp_auth');
    setAuth(null);
  };

  return (
    <Ctx.Provider
      value={{
        user: auth?.user || null,
        token: auth?.token || null,
        login,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
