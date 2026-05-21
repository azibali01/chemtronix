import { useForm } from "@mantine/form";
import {
  TextInput,
  Button,
  Card,
  Title,
  Stack,
  Text,
  PasswordInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { useAuth } from "../Context/AuthContext";
import { useNavigate } from "react-router";
import api from "../../api_configuration/api";

const Login = () => {
  const { login } = useAuth();
  const [visible, { toggle }] = useDisclosure(false);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!userName || !password) {
      notifications.show({
        message: "Please enter username and password",
        color: "red",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", {
        userName,
        password,
      });

      // Store the JWT token
      localStorage.setItem("access_token", res.data.access_token);

      // Update auth context with user data
      login(res.data.user);

      notifications.show({
        message: "Login successful",
        color: "green",
      });

      navigate("/dashboard");
    } catch (error: unknown) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Invalid username or password";

      notifications.show({
        message: errorMessage,
        color: "red",
        title: "Login Failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const form = useForm({
    mode: "uncontrolled",
    initialValues: { email: "" },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
    },
  });

  const handleError = (errors: typeof form.errors) => {
    if (errors.email) {
      notifications.show({
        message: "Please provide a valid email",
        color: "red",
      });
    }
  };

  return (
    <Stack>
      <Card
        withBorder
        shadow="md"
        w={420}
        p="lg"
        style={{
          backgroundColor: "#1f232c",
          borderColor: "#83746e",
        }}
      >
        <Stack align="center" justify="center" gap="md">
          <Title order={3} c="#dfd6d1">
            Point of Sale
          </Title>
          <Text c="#a9a9a9">Sign in to your account</Text>

          <form
            onSubmit={form.onSubmit(console.log, handleError)}
            style={{ width: "100%" }}
          >
            <Stack gap="md">
              <TextInput
                value={userName}
                onChange={(event) => setUserName(event.currentTarget.value)}
                label="Username"
                placeholder="Enter your username"
                required
                styles={{
                  label: { color: "#dfd6d1", fontWeight: 600 },
                  input: {
                    backgroundColor: "#2a2f38",
                    color: "#ffffff",
                    borderColor: "#83746e",
                    "&:focus": {
                      borderColor: "#dfd6d1",
                      boxShadow: "0 0 4px #83746e",
                    },
                  },
                }}
              />

              <PasswordInput
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                label="Password"
                placeholder="Enter your password"
                required
                visible={visible}
                onVisibilityChange={toggle}
                styles={{
                  label: { color: "#dfd6d1", fontWeight: 600 },
                  input: {
                    backgroundColor: "#2a2f38",
                    color: "#ffffff",
                    borderColor: "#83746e",
                    "&:focus": {
                      borderColor: "#dfd6d1",
                      boxShadow: "0 0 4px #83746e",
                    },
                  },
                }}
              />

              <Button
                fullWidth
                mt="sm"
                color="#83746e"
                loading={loading}
                styles={{
                  root: {
                    color: "#ffffff",
                    fontWeight: 600,
                    "&:hover": { backgroundColor: "#dfd6d1", color: "#1f232c" },
                  },
                }}
                onClick={handleLogin}
              >
                Login
              </Button>
            </Stack>
          </form>
        </Stack>
      </Card>
    </Stack>
  );
};

export default Login;
