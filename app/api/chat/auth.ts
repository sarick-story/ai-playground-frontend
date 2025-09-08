import { GoogleAuth } from "google-auth-library";

// Create a fallback for when credentials aren't available
let googleAuth: GoogleAuth;

try {
  // Only try to parse if the environment variable exists and is not empty
  if (process.env.GOOGLE_KEY_JSON) {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_KEY_JSON, "base64").toString(),
    );
    googleAuth = new GoogleAuth({ credentials });
  } else {
    // Use application default credentials when no specific credentials are provided
    googleAuth = new GoogleAuth();
    console.warn(
      "GOOGLE_KEY_JSON not provided, using application default credentials",
    );
  }
} catch (error) {
  console.error("Error parsing GOOGLE_KEY_JSON:", error);
  // Fallback to application default credentials
  googleAuth = new GoogleAuth();
}

export { googleAuth };

export async function getIdToken(serviceUrl: string) {
  try {
    const client = await googleAuth.getIdTokenClient(serviceUrl);
    const token = await client.idTokenProvider.fetchIdToken(serviceUrl);

    if (!token) {
      throw new Error("Failed to generate ID token - token is empty");
    }

    return token;
  } catch (error) {
    console.error(`Error generating ID token for ${serviceUrl}:`, error);

    // Provide more context based on common errors
    if (error instanceof Error) {
      if (error.message.includes("Could not load the default credentials")) {
        throw new Error(
          "Authentication not configured. Please set GOOGLE_KEY_JSON environment variable.",
        );
      }
      if (
        error.message.includes("Permission") ||
        error.message.includes("403")
      ) {
        throw new Error(
          "Service account lacks Cloud Run Invoker role. Grant roles/run.invoker permission.",
        );
      }
    }

    throw error;
  }
}
