import { View, StyleSheet } from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    console.log(data);
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text variant="headlineLarge" style={styles.title}>
          Login
        </Text>
        
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <View>
              <TextInput
                label="Email"
                mode="outlined"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                error={!!errors.email}
              />
              {errors.email && (
                <HelperText type="error">
                  {errors.email.message}
                </HelperText>
              )}
            </View>
          )}
        />
        
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <View>
              <TextInput
                label="Password"
                mode="outlined"
                secureTextEntry
                style={styles.input}
                value={value}
                onChangeText={onChange}
                error={!!errors.password}
              />
              {errors.password && (
                <HelperText type="error">
                  {errors.password.message}
                </HelperText>
              )}
            </View>
          )}
        />

        <Button
          mode="contained"
          style={styles.button}
          contentStyle={styles.buttonContent}
          onPress={handleSubmit(onSubmit)}
        >
          Sign In
        </Button>
      </View>
    </View>
  );
}

//TODO: Move styles to a separate file or can we use native wind ?
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  form: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    marginHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
}); 