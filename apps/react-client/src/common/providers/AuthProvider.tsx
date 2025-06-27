import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

interface AuthProviderProps {
	token?: string;
	children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
	token,
	children,
}) => {
	const setAccessToken = useAuthStore((state) => state.setAccessToken);

	useEffect(() => {
		if (token) {
			setAccessToken(token);
		}
	}, [token, setAccessToken]);

	return <>{children}</>;
};
