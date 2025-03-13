import { GoogleAuth } from "google-auth-library";

// Create a fallback for when credentials aren't available
let googleAuth: GoogleAuth;

try {
  // Only try to parse if the environment variable exists and is not empty
  if (process.env.GOOGLE_KEY_JSON) {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_KEY_JSON, "base64").toString()
    );
    googleAuth = new GoogleAuth({ credentials });
  } else {
    // Use application default credentials when no specific credentials are provided
    googleAuth = new GoogleAuth({
      scopes: "https://www.googleapis.com/auth/cloud-platform",
    });
    console.warn("GOOGLE_KEY_JSON not provided, using application default credentials");
  }
} catch (error) {
  console.error("Error parsing GOOGLE_KEY_JSON:", error);
  // Fallback to application default credentials
  googleAuth = new GoogleAuth({
    scopes: "https://www.googleapis.com/auth/cloud-platform",
  });
}

export { googleAuth };

export async function getIdToken(serviceUrl: string) {
  try {
    const client = await googleAuth.getIdTokenClient(serviceUrl);
    return client.idTokenProvider.fetchIdToken(serviceUrl);
  } catch (error) {
    console.error("Error generating ID token:", error);
    throw error;
  }
}
