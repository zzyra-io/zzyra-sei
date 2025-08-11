# Magic Link Domain Allowlist Implementation Guide

## Overview

Domain Allowlist is a critical security feature for Magic Link authentication that establishes a strong security posture by default. It only permits communication with specific domains and redirect URIs that have been explicitly approved, protecting your public API keys from unauthorized usage.

## Why Domain Allowlist is Important for Zzyra

For Zzyra as a production-ready SAAS platform:

1. **Security by Default**: Prevents unauthorized domains from using your Magic Link API keys
2. **Protection Against Phishing**: Ensures authentication flows only occur on trusted domains
3. **Compliance**: Helps meet security requirements for enterprise customers
4. **Required for New Projects**: Mandatory for all new Magic Link applications

## Implementation in Zzyra

### 1. Dashboard Configuration

1. Navigate to the [Magic dashboard](https://dashboard.magic.link/)
2. Select your Zzyra application
3. Go to the "Settings" tab
4. Scroll to "Allowed Origins & Redirects"
5. Toggle on the domain allowlist feature
6. Add all domains that will be used with your Zzyra application:
   - Production domain (e.g., `https://app.zzyra.com`)
   - Staging/testing domains (e.g., `https://staging.zzyra.com`)
   - Development domains (e.g., `http://localhost:3000`)

### 2. Domains to Include

For a complete implementation, ensure you add all domains where Zzyra will be accessed:

- **Production**: Your main application domain
- **Staging/QA**: Any pre-production environments
- **Development**: Local development environments (`localhost`)
- **Custom Domains**: If you offer custom domain functionality to customers

### 3. Redirect URIs

If you're using OAuth with Magic Link, ensure you add all redirect URIs:

- `/callback` endpoints (e.g., `https://app.zzyra.com/callback`)
- Any other OAuth redirect paths used in your application

## Technical Implementation

The Magic SDK in Zzyra has been updated to work with domain allowlisting. The implementation is in:

- `packages/wallet/src/adapters/browser/magic-browser.ts`

The SDK automatically respects the allowlist settings configured in the Magic dashboard, so no additional code changes are needed beyond what's already implemented.

## Programmatic Configuration (Optional)

For automated deployments or CI/CD pipelines, you can use Magic's API to manage the domain allowlist:

```bash
curl --location --request POST 'https://api.magic.link/v2/api/magic_client/allowlist/add' \
--header 'X-Magic-Secret-Key: YOUR_SECRET_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{
    "access_type": "domain",
    "target_client_id": "YOUR_CLIENT_ID",
    "value": "https://app.zzyra.com"
}'
```

## Testing Domain Allowlist

1. **Verify Allowed Domains**: Test authentication from all your allowlisted domains
2. **Verify Blocked Domains**: Attempt to use Magic Link from a non-allowlisted domain (should be blocked)
3. **Check Error Handling**: Ensure your application gracefully handles allowlist rejection errors

## Troubleshooting

If users encounter issues with Magic Link authentication:

1. **Check Dashboard Configuration**: Verify all required domains are in the allowlist
2. **Inspect Browser Console**: Look for domain allowlist rejection errors
3. **Check Redirect URIs**: Ensure OAuth redirect URIs are properly allowlisted
4. **Verify Protocol**: Make sure you're using the correct protocol (http vs https)

## Best Practices

1. **Limit Allowlisted Domains**: Only include domains that actually need access
2. **Review Regularly**: Periodically audit your allowlisted domains
3. **Use HTTPS**: Always use HTTPS for production domains
4. **Document Changes**: Keep a record of any changes to the allowlist

## References

- [Magic Link Domain Allowlist Documentation](https://magic.link/docs/authentication/security/allowlists/domain-allowlist)
- [Magic API Reference](https://magic.link/docs/api-reference/client-side-sdks/web)
