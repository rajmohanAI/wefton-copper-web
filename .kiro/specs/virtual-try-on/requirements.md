# Requirements Document

## Introduction

This document defines the requirements for a "Try On" feature on the Wefton Copper product page. While viewing a product, a Customer can open a Try-On experience for the currently selected outfit (size/colour), upload their own photo, provide height and size, and see a visual preview of the garment applied to a figure derived from their photo, with a gentle animated (approximate 360°) presentation.

The first version runs entirely for free using **on-device** technology: an open-source pose-detection model (MediaPipe / TensorFlow.js) runs in the Customer's browser to locate the body, and the product's garment image is composited over the detected pose. No AI service is called and no server cost is incurred. The uploaded photo is handled **ephemerally** — kept only in the browser's temporary memory for the duration of the Try-On session and permanently discarded when the Customer navigates away, goes to checkout, or closes the tab. It is never uploaded to Wefton storage, never persisted, and never shared.

The Try-On engine is designed behind a **swappable provider interface** so that a photoreal AI provider (e.g. Google Vertex AI Virtual Try-On, FASHN) can replace the free on-device method later without redesigning the UI or the privacy model.

Honesty of presentation is a hard requirement: because the free method is an approximate composite (not a photograph and not a true rotatable 3D avatar), the experience must be clearly labelled as an approximate visualization.

The platform is a Next.js 16 application (React 19, TypeScript) on Firebase App Hosting for project `weflive-58678`. The feature integrates into the existing product detail page (`ProductDetailClient.tsx`).

---

## Glossary

- **Platform**: The Wefton Copper Next.js 16 web application (`wefton-copper/wefton-platform`).
- **Customer**: An end-user viewing a product; may be a guest (no login required for Try-On).
- **Product_Page**: The product detail view rendered by `ProductDetailClient.tsx`.
- **Selected_Outfit**: The product plus the Customer's currently selected size and colour/variant at the moment Try-On is opened.
- **Try_On**: The feature that previews the Selected_Outfit on a figure derived from the Customer's photo.
- **Try_On_Modal**: The dialog UI that hosts the consent, upload, inputs, and preview steps.
- **User_Photo**: The image the Customer uploads of themselves.
- **Pose_Engine**: The on-device pose/body-landmark detector (MediaPipe / TensorFlow.js) that runs in the browser.
- **Garment_Image**: A product image suitable for overlay — ideally a clean cutout (transparent or plain background). May be a dedicated per-product "try-on image".
- **Composite**: The generated preview: the Garment_Image scaled and positioned over the figure from the User_Photo.
- **Try_On_Provider**: The swappable implementation that turns (User_Photo, Selected_Outfit, height, size) into a preview. V1 provider = on-device composite; future providers = paid AI.
- **Ephemeral**: Held only in volatile browser memory/session for the current Try-On session; never persisted to disk or server.
- **Consent_Gate**: The mandatory Terms & Conditions acceptance required before uploading.
- **Approximate_Notice**: The clearly visible label stating the preview is an approximate visualization, not a photograph.
- **Firestore**: The Firebase Cloud Firestore database (used here only for the optional per-product Garment_Image reference, not for photos).

---

## Requirements

### Requirement 1: Try-On Entry Point on the Product Page

**User Story:** As a Customer viewing a product, I want a clear "Try On" action for the outfit I have selected, so that I can preview it on myself.

#### Acceptance Criteria

1. THE Product_Page SHALL display a "Try On" control alongside the existing Add to Cart / wishlist / share actions.
2. THE Try_On SHALL operate on the Selected_Outfit — the product plus the currently selected size and colour/variant at the time Try-On is opened.
3. WHEN the product has selectable sizes and none is selected, THE Platform SHALL prompt the Customer to select a size before starting Try-On (consistent with the existing Add to Cart behaviour).
4. THE Try_On SHALL be available to guests and does not require login.
5. THE Try_On control SHALL be visually consistent with the existing product-page buttons and brand styling.

### Requirement 2: Consent and Terms & Conditions Gate

**User Story:** As the Platform owner, I want the Customer to explicitly accept clear terms before uploading a photo, so that expectations, privacy, and prohibited uses are established up front.

#### Acceptance Criteria

1. THE Try_On_Modal SHALL present the Terms & Conditions before any photo upload is possible.
2. THE Consent_Gate SHALL require an explicit affirmative action (e.g. a checkbox plus continue) and SHALL NOT be pre-accepted.
3. THE Terms & Conditions SHALL clearly state, at minimum:
   a. The uploaded photo is stored only in temporary browser cache for the current session and is permanently deleted when the Customer moves to checkout or another screen, closes the tab, or ends the session; it is never saved or shared to any source.
   b. The Customer must upload only their own photo and must not upload confidential, private, or restricted images, including pictures of children or of other/familiar persons without consent.
   c. Wefton cannot be held responsible for any misuse or misinterpretation of graphical content generated through this feature.
   d. The preview is an approximate visualization for styling reference only and may not reflect exact fit, colour, or drape.
4. WHEN the Customer has not accepted the Terms & Conditions, THE Try_On_Modal SHALL keep the upload and generation controls disabled.
5. THE Terms & Conditions text SHALL be readable within the modal (scrollable if long) and SHALL be available in the site's legal pages for reference.

### Requirement 3: Photo Upload and Inputs

**User Story:** As a Customer, I want to upload my photo and enter my height and size, so that the preview is scaled to me.

#### Acceptance Criteria

1. WHEN consent is given, THE Try_On_Modal SHALL allow selecting or capturing a single User_Photo (JPEG, PNG, or WebP) within a defined size limit.
2. THE Try_On_Modal SHALL let the Customer enter their height and confirm/adjust the size carried from the Selected_Outfit.
3. IF the uploaded file is not a supported image type or exceeds the size limit, THEN THE Try_On_Modal SHALL show a clear error and SHALL NOT proceed.
4. THE Try_On_Modal SHALL show the User_Photo preview locally (from an in-memory object URL) without uploading it anywhere.
5. THE Try_On_Modal SHALL allow the Customer to replace or remove the uploaded photo before generating.

### Requirement 4: On-Device Figure Detection and Garment Composite (Free V1)

**User Story:** As a Customer, I want to see the garment placed on a figure based on my photo, so that I get a sense of how it looks on me.

#### Acceptance Criteria

1. THE Pose_Engine SHALL run entirely in the Customer's browser and SHALL NOT transmit the User_Photo off the device.
2. THE Try_On_Provider (V1) SHALL detect body landmarks from the User_Photo and SHALL composite the Garment_Image over the torso region, scaled and positioned using the detected landmarks and the entered height/size.
3. WHEN body landmarks cannot be detected (e.g. no clear full/upper body), THE Try_On_Modal SHALL inform the Customer and SHALL offer guidance (e.g. use a clear, front-facing, upper-body photo) rather than failing silently.
4. THE Composite SHALL use the Selected_Outfit's Garment_Image; WHEN a dedicated try-on cutout image is configured for the product, THE Provider SHALL prefer it over the standard product image.
5. THE feature SHALL display an Approximate_Notice making clear the result is an approximate visualization, not a photograph.

### Requirement 5: Preview and Animated (Approximate 360°) Presentation

**User Story:** As a Customer, I want to view the result with some motion, so that it feels more like seeing the outfit in the round.

#### Acceptance Criteria

1. THE Try_On_Modal SHALL display the generated Composite prominently.
2. THE Try_On_Modal SHALL provide an animated presentation (e.g. a gentle rotate/sway of the figure or an angle toggle) to approximate a 360° view, clearly presented as an approximation rather than a true 3D rotation.
3. THE Customer SHALL be able to re-generate with a different photo, size, or height without leaving the modal.
4. THE Try_On_Modal SHALL allow the Customer to proceed to add the Selected_Outfit to the cart from within or immediately after the Try-On.

### Requirement 6: Ephemeral Photo Handling and Deletion

**User Story:** As a Customer, I want certainty that my photo is not stored or shared, so that I can use the feature with confidence.

#### Acceptance Criteria

1. THE Platform SHALL keep the User_Photo only in volatile browser memory (in-memory blob / object URL) for the duration of the Try-On session and SHALL NOT upload it to Wefton servers or Firebase Storage.
2. WHEN the Customer navigates to the checkout page, navigates to another screen/route, closes the Try_On_Modal, closes the tab, or after an inactivity timeout, THE Platform SHALL permanently discard the User_Photo and any derived Composite from memory (revoke object URLs, clear state, clear any session storage used).
3. THE Platform SHALL NOT write the User_Photo to `localStorage`, `IndexedDB`, cookies, server logs, analytics, or any persistent store.
4. THE Platform SHALL NOT transmit the User_Photo to any third party in the V1 (on-device) provider.
5. WHEN a future paid Try_On_Provider transmits the User_Photo to an external AI service, THE Platform SHALL disclose that transmission in the Terms & Conditions and SHALL select a provider whose data policy supports non-retention; this requirement gates enabling any such provider.

### Requirement 7: Content Safety and Abuse Prevention

**User Story:** As the Platform owner, I want safeguards against misuse, so that the feature is not used to depict others without consent or to create harmful content.

#### Acceptance Criteria

1. THE Terms & Conditions SHALL prohibit uploading images of other people (including children) and any confidential, private, or restricted images, and SHALL require the Customer to confirm the photo is of themselves and lawful to use.
2. THE feature SHALL frame the experience explicitly as trying clothing on oneself.
3. THE Platform SHALL NOT provide any capability to save, export, or share the generated Composite depicting a person other than a local, user-initiated download of their own result (if offered at all).
4. WHEN a future paid provider is used, THE Platform SHALL enable that provider's available safety filters.
5. THE Platform SHALL present the misuse disclaimer stating Wefton is not responsible for misuse or misinterpretation of generated graphical content.

### Requirement 8: Provider Abstraction (Future Upgrade Path)

**User Story:** As a developer, I want the Try-On engine behind a clean interface, so that we can upgrade to photoreal AI later without rebuilding the feature.

#### Acceptance Criteria

1. THE Platform SHALL define a Try_On_Provider interface that accepts the User_Photo, Selected_Outfit/Garment_Image, height, and size, and returns a preview result.
2. THE V1 on-device composite SHALL be one implementation of that interface.
3. THE UI, consent flow, and ephemeral handling SHALL depend on the interface, not on the concrete provider, so that swapping providers does not require UI or privacy-model changes.
4. THE selection of the active provider SHALL be configurable.

### Requirement 9: Per-Product Try-On Image (Admin, Optional)

**User Story:** As an Admin, I want to optionally provide a clean garment image for Try-On, so that composites look better.

#### Acceptance Criteria

1. THE Platform SHALL allow an optional per-product "try-on image" reference to be stored on the Product.
2. WHEN no dedicated try-on image exists, THE Provider SHALL fall back to the product's primary image.
3. THE admin capability to set the try-on image SHALL reuse the existing product image management where practical and SHALL remain admin-gated.

### Requirement 10: Performance, Accessibility, and Non-Functional

**User Story:** As a Customer on a typical device, I want the feature to work smoothly and accessibly, so that it is usable.

#### Acceptance Criteria

1. THE Pose_Engine and its model assets SHALL load only when the Customer opens Try-On (lazy/dynamic import), so that the customer-facing product page bundle is not burdened for users who do not use it.
2. THE Try_On_Modal SHALL be keyboard accessible and SHALL provide appropriate labels/roles consistent with the app's other Radix dialogs.
3. THE feature SHALL degrade gracefully on unsupported browsers/devices (e.g. no WebGL / model load failure) with a clear message.
4. THE feature SHALL not alter or regress the existing product-page behaviour (gallery, variants, add to cart).
5. THE feature SHALL be served over HTTPS.
