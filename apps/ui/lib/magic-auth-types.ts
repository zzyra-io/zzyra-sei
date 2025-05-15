/**
 * Magic SDK Integration Types
 *
 * This file defines the types used for the Magic SDK integration.
 */

/**
 * Defines the supported OAuth providers for Magic Link.
 * These should align with what Magic SDK supports.
 */
export enum OAuthProvider {
  GOOGLE = "google",
  APPLE = "apple",
  GITHUB = "github",
  FACEBOOK = "facebook",
  TWITTER = "twitter",
  DISCORD = "discord",
  LINKEDIN = "linkedin",
  // Add more as supported by Magic and your app
}
