import { getVercelOidcToken } from "@vercel/functions/oidc";
import { GoogleAuth, ExternalAccountClient } from "google-auth-library";

const credentials = JSON.parse(
  Buffer.from(process.env.GOOGLE_KEY_JSON ?? "", "base64").toString()
);

export const googleAuth = new GoogleAuth({ credentials });

export async function getIdToken(serviceUrl: string) {
  try {
    const auth = new GoogleAuth({
      scopes: "https://www.googleapis.com/auth/cloud-platform",
    });

    const client = await auth.getIdTokenClient(serviceUrl);

    return client.idTokenProvider.fetchIdToken(serviceUrl);
  } catch (error) {
    console.error("Error generating ID token:", error);
    throw error;
  }
}

// const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
// const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER;
// const GCP_SERVICE_ACCOUNT_EMAIL = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
// const GCP_WORKLOAD_IDENTITY_POOL_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
// const GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;

const GCP_PROJECT_NUMBER = "136402401870";
const GCP_SERVICE_ACCOUNT_EMAIL =
  "vercel@employee-managed-validator.iam.gserviceaccount.com";
const GCP_WORKLOAD_IDENTITY_POOL_ID = "vercel";
const GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = "vercel";

// Initialize the External Account Client
export const authClient = ExternalAccountClient.fromJSON({
  type: "external_account",
  audience: `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
  subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
  token_url: "https://sts.googleapis.com/v1/token",
  service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
  subject_token_supplier: {
    // Use the Vercel OIDC token as the subject token
    getSubjectToken: getVercelOidcToken,
  },
});
