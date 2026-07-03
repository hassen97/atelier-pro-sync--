// TEMPORARY — data for the one-time live DB restore. Safe to delete after use.
export const RESTORE_PAYLOAD_URL =
  "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/0e36f2cd-d541-4f93-98e5-2b14ad533e14/restore-payload.json.gz";

export interface RestoreFile {
  bucket: string;
  path: string;
  url: string;
  content_type: string;
}

export const RESTORE_FILES: RestoreFile[] = [
  { bucket: "shop-logos", path: "063484c8-4b9e-47d2-9f7e-1e72f62380a6/logo.png", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/f96db5e1-5717-4391-a752-26045a86f062/logo.png", content_type: "image/png" },
  { bucket: "shop-logos", path: "26c3f824-a3a7-44f4-8664-9c7d15116e9a/logo.png", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/df7e512b-0eed-410d-986a-f1224bcf692d/logo.png", content_type: "image/png" },
  { bucket: "shop-logos", path: "26c3f824-a3a7-44f4-8664-9c7d15116e9a/logo-optimized-1782789733708.png", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/90b7e61f-9368-4536-98ee-bbacb61a1639/logo-optimized-1782789733708.png", content_type: "image/png" },
  { bucket: "shop-logos", path: "8b499584-fc8f-4e25-8e8e-f58fb9d57c69/logo.jpg", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/dde55055-2709-4cec-905b-d0a7309cc084/logo.jpg", content_type: "image/jpeg" },
  { bucket: "shop-logos", path: "c8a47d37-ecc5-44ee-8b1e-3447925f554b/logo.PNG", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/75bc530f-fd1e-4e47-981c-494c8213ffb9/logo.PNG", content_type: "image/png" },
  { bucket: "shop-logos", path: "c8a47d37-ecc5-44ee-8b1e-3447925f554b/logo-optimized-1782789751262.png", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/0a4caf17-6f08-4ac7-82b8-c597551de086/logo-optimized-1782789751262.png", content_type: "image/png" },
  { bucket: "shop-logos", path: "d354384a-fb3a-4ffc-9802-a3929e2cbb51/logo.png", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/e2647d4b-c809-4060-a25c-f2b0d104917f/logo.png", content_type: "image/png" },
  { bucket: "shop-logos", path: "e6b90441-e5fb-4a09-b548-cf1c98cfe74a/logo.jpg", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/c98718a3-88c8-401f-9e41-3a2d8f5b826d/logo.jpg", content_type: "image/jpeg" },
  { bucket: "shop-logos", path: "f5092578-42f8-4f66-8e09-5f33d235763b/logo.jpg", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/f5b8684a-b761-423b-a908-9c6892efead0/logo.jpg", content_type: "image/jpeg" },
  { bucket: "shop-logos", path: "f54df59f-6546-4352-b6d3-2b63ada6f6fb/logo.png", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/489c0fe4-28d9-4a39-8eb8-f9adb2eaeada/logo.png", content_type: "image/png" },
  { bucket: "shop-logos", path: "f7f330d8-b9dd-48fc-9756-00e7718131d5/logo.jpg", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/4ad99f8e-ce3b-4e0d-bd53-5061b16c3831/logo.jpg", content_type: "image/jpeg" },
  { bucket: "payment-proofs", path: "26c3f824-a3a7-44f4-8664-9c7d15116e9a/1776109929003.jpg", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/c30d0bd9-c0da-48cb-bb1f-19640f184f69/1776109929003.jpg", content_type: "image/jpeg" },
  { bucket: "payment-proofs", path: "26c3f824-a3a7-44f4-8664-9c7d15116e9a/1777057738821.jpg", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/973e1d9b-6621-4525-8ac7-4658e435ccef/1777057738821.jpg", content_type: "image/jpeg" },
  { bucket: "payment-proofs", path: "26c3f824-a3a7-44f4-8664-9c7d15116e9a/1780000239471.jpg", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/95368ae5-0fba-4561-823b-9bbd50c87070/1780000239471.jpg", content_type: "image/jpeg" },
  { bucket: "payment-proofs", path: "42aef24e-de07-4358-b900-9f45c85791fe/1774869374034.jpg", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/38703003-7683-4301-96c7-f6a9636c70a2/1774869374034.jpg", content_type: "image/jpeg" },
  { bucket: "payment-proofs", path: "4c45b019-487b-402b-b26e-e52d16cc256e/1773767915907.png", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/a1270ed3-52b5-4af8-acc1-f1f42c8de9d5/1773767915907.png", content_type: "image/png" },
  { bucket: "payment-proofs", path: "4c45b019-487b-402b-b26e-e52d16cc256e/1773767741865.jpg", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/02bc448e-be82-414f-8424-3c303607ee9c/1773767741865.jpg", content_type: "image/jpeg" },
  { bucket: "payment-proofs", path: "4c45b019-487b-402b-b26e-e52d16cc256e/1773768800411.jpg", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/aff29230-bbfc-4382-bdfc-be4254cc9b32/1773768800411.jpg", content_type: "image/jpeg" },
  { bucket: "payment-proofs", path: "720a280e-442a-4e13-9012-7b518dcdc44d/1774265364369.png", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/ebf1f41e-6eb6-4adf-b091-693a3807de56/1774265364369.png", content_type: "image/png" },
  { bucket: "payment-proofs", path: "c8a47d37-ecc5-44ee-8b1e-3447925f554b/1782402743907.png", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/6e6290e5-a7c3-4b5c-8e16-a9f3d360c1ec/1782402743907.png", content_type: "image/png" },
  { bucket: "payment-proofs", path: "ff00ff32-1b1d-4e9a-9153-42e7804c0ec2/1782681596038.jpg", url: "https://atelier-pro-syncc.lovable.app/__l5e/assets-v1/33b8a769-30f2-4043-b4bd-ca246733c3d7/1782681596038.jpg", content_type: "image/jpeg" },
];
