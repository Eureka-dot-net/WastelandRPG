import { useState } from "react";

export const useAuthForm = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  return {
    email,
    password,
    showPassword,
    setEmail,
    setPassword,
    togglePasswordVisibility,
    resetForm,
  };
};