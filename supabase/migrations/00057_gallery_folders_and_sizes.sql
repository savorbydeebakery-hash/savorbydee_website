-- Gallery folders, and each photo's shape (client, 2026-11-05).
--
-- folder: one of the folders in lib/gallery/folders.ts, or null for not filed yet.
-- A plain column rather than a table: the list is short and fixed for now, and a
-- photo sits in one folder.
--
-- width, height: the photo's shape, so its space on the page is known before it
-- loads. Without them the gallery's columns reshuffled and the homepage strip's
-- photos changed width as each one arrived, which read as photos reloading. Only
-- the ratio matters: the values below were measured from 400px-wide copies.

alter table public.gallery_photos
  add column if not exists folder text,
  add column if not exists width integer,
  add column if not exists height integer;

comment on column public.gallery_photos.folder is
  'Gallery folder slug from lib/gallery/folders.ts. Null: not filed yet, shown under All only.';
comment on column public.gallery_photos.width is
  'With height, the photo''s aspect ratio. Null: not measured, shown in a default-shaped tile.';

update public.gallery_photos as g
set width = v.width, height = v.height
from (values
  ('a0137408-e85d-44ae-833f-6092a6e0ce0b'::uuid, 400, 400),
  ('636acea1-e8eb-4854-8b84-2c14a72ed899'::uuid, 400, 533),
  ('9dfe54a4-880e-4cc4-a2a9-2c0dda15ad1b'::uuid, 400, 500),
  ('0f942b75-b179-4487-b266-7b5d6ea36a5f'::uuid, 400, 533),
  ('b3e0fc4b-e481-46e7-973c-6ed3ea32e5fc'::uuid, 400, 533),
  ('869a8c29-bd71-44b6-b09a-4393a9eba5b6'::uuid, 400, 400),
  ('4ccd6fba-ba98-44a4-aede-a3ec04bdc18a'::uuid, 400, 533),
  ('e7dc0893-c8e0-4d06-ada8-9c677328fe86'::uuid, 400, 500),
  ('a3b9e556-7fe6-47c7-9a63-472a3221dae3'::uuid, 400, 500),
  ('47d0f577-0d37-43f0-95f2-848564d5c843'::uuid, 400, 500),
  ('500b0507-4bb9-4e66-baf4-556abde63ce1'::uuid, 400, 533),
  ('ffa47b3e-fee4-446b-aa66-22fa8d66fde3'::uuid, 400, 533),
  ('32f9b5a4-ff0d-4f40-baa9-22ea04cedd61'::uuid, 400, 300),
  ('c81bdf19-5d6b-4f88-b4df-b0e8390d4403'::uuid, 400, 400),
  ('815c9acf-1835-4525-8074-eef47d7cfc16'::uuid, 400, 533),
  ('8467efa7-e11e-4e84-8223-e117343e5790'::uuid, 400, 533),
  ('61db6afb-d520-41f8-98d4-624b836d6d55'::uuid, 400, 400),
  ('f73a02b4-5cb3-4548-a987-109bd4929712'::uuid, 400, 533),
  ('2930b7ab-0de2-49ec-9224-b3d1649d9d80'::uuid, 400, 500),
  ('9620c9d1-0b3d-498d-b478-76daebf79f2a'::uuid, 400, 500),
  ('ee0c5ff1-12f2-4be1-96c6-1eaf1f70830a'::uuid, 400, 500),
  ('835a6da4-07e4-4392-9a14-a6b8aad53f1f'::uuid, 400, 500),
  ('058195be-9e29-418e-b9ab-0a9960c54160'::uuid, 400, 571),
  ('61a174c7-eca2-49d7-bbe7-37b74cac8c23'::uuid, 400, 500),
  ('3615e035-80ba-429f-bd95-6640cb718473'::uuid, 400, 500),
  ('251e7b75-95c7-464a-afa5-3ae0cae2d418'::uuid, 400, 500),
  ('81e2a5bf-f359-4a69-933f-28620743806d'::uuid, 400, 533),
  ('db2f9b43-14ae-4904-9e26-1fbb6edad53b'::uuid, 400, 500),
  ('844a44c8-b64b-41e2-9bf8-43623da13bf3'::uuid, 400, 533),
  ('81f72e9d-728c-4ae4-8b15-605217516441'::uuid, 400, 533),
  ('8f0efb2e-7fa8-45d0-a871-312c72bb4254'::uuid, 400, 500),
  ('db9d0285-da01-4937-9baf-d82f27b1bcf1'::uuid, 400, 541),
  ('4b2ff3de-6c19-4ae7-987d-d56ac7ead2a0'::uuid, 400, 500),
  ('60713588-fc7a-467e-9225-8d9a330e6c42'::uuid, 400, 500),
  ('cfb0e962-0901-489a-abfe-011f1d3209ca'::uuid, 400, 400),
  ('a63808ae-6e05-434f-a9a7-28e69f8dea99'::uuid, 400, 500),
  ('c0e107ab-3c8f-4901-88c3-ec06120e73e4'::uuid, 400, 400),
  ('4a4bf2e9-1020-4c46-9d2a-e89b8f819b93'::uuid, 400, 400),
  ('974b20f6-f84c-4780-86d3-3c4f0d23e271'::uuid, 400, 500),
  ('9d690ad1-356b-43ee-957e-20b1dd7506da'::uuid, 400, 500),
  ('f6a4be12-c51a-441e-833f-74c02d4b9c04'::uuid, 400, 500),
  ('de8cc1ad-2644-4642-8f99-2bde530e4b2b'::uuid, 400, 300),
  ('fd527d9c-3f5c-4cc1-9094-d63700586495'::uuid, 400, 533),
  ('5588c3f0-093d-4084-8d95-dcd72ddad9d0'::uuid, 400, 500),
  ('d80f2ea2-7ec1-42bb-ada6-d6d8c208abfc'::uuid, 400, 500),
  ('bbacf622-79af-409d-8dba-cd0bd25dc275'::uuid, 400, 342),
  ('d10f3135-e379-48e0-bf14-783e872ca552'::uuid, 400, 500),
  ('742df3b7-cdd8-47e9-82e7-a09fe354e548'::uuid, 400, 500),
  ('e0f9e6cd-cf1e-49e7-81c9-dcb2900033bb'::uuid, 400, 400),
  ('a92b970e-acb0-4045-91aa-62f15c8148c7'::uuid, 400, 500),
  ('e095b0fb-3100-479c-9410-3f5ce969b676'::uuid, 400, 400),
  ('fdaeae85-d426-4beb-b8ca-eca15db4bc5d'::uuid, 400, 500),
  ('9c826803-472f-4002-97ec-9b0dd3084f3b'::uuid, 400, 400),
  ('b6dc5425-5f41-4333-a310-702c882b7289'::uuid, 400, 400),
  ('dd8bd4c5-6fa2-4bc0-91e8-c7f070a79e83'::uuid, 400, 400),
  ('5b3b17cb-1132-48d3-a0a6-54d319a91aca'::uuid, 400, 500),
  ('5aa58e7c-3bf4-44d3-be57-c169c23124b8'::uuid, 400, 400),
  ('c5833ad9-d9f4-4265-b4c8-527b4303ba17'::uuid, 400, 500),
  ('6ce40e33-daa8-49cc-a5c6-95898d32c277'::uuid, 400, 679),
  ('41c98b43-fb76-4b9d-a35d-3884febd13cb'::uuid, 400, 400),
  ('78428a8f-5e32-4b05-9c97-6444739a9a31'::uuid, 400, 400),
  ('a152cf07-6e99-4bde-bd4e-18694512657e'::uuid, 400, 400),
  ('e23ddb0a-2f02-447e-af29-8cf5c49ee06a'::uuid, 400, 400),
  ('5d7c6cc6-6b29-4f6f-b220-11cc268f4b5c'::uuid, 400, 400),
  ('dfecd50c-9910-4879-a2a9-a3391f1a57d5'::uuid, 400, 500),
  ('00167b0b-9274-4acd-94f2-093c98b9882a'::uuid, 400, 500),
  ('1976d126-f202-4ab0-9ca9-c76683b65609'::uuid, 400, 533),
  ('556e48ec-7938-44be-b22b-5bc00ce28022'::uuid, 400, 500),
  ('c09fe306-e465-43b1-8bee-4c797aa9ffc4'::uuid, 400, 500),
  ('14e2a486-f254-4cf6-a0e3-fa2dad43512f'::uuid, 400, 400),
  ('b92958aa-2c51-4427-800c-2a0aec5feed8'::uuid, 400, 500),
  ('21051f6a-0364-49bd-a5b2-634b53b3c623'::uuid, 400, 533),
  ('9d633b3f-1c78-4e87-a596-5f8d142bd7dd'::uuid, 400, 533),
  ('7ff4c625-137b-4ee3-8085-4c17820696c0'::uuid, 400, 400),
  ('f37d151e-b647-4fac-95d2-5aeb1cc4ac2b'::uuid, 400, 400),
  ('00a443c4-90ae-43e1-b445-ed7465ba894d'::uuid, 400, 400),
  ('bfb1ca96-d485-4758-b448-85bc0d32be43'::uuid, 400, 400),
  ('36169ffa-ad43-40f5-916c-ea01ce4326f0'::uuid, 400, 533),
  ('8f8eb4c1-debb-4f72-93d6-ed6d193c4708'::uuid, 400, 500),
  ('b68159ae-d7ca-4a8d-bd59-74d38e0268f6'::uuid, 400, 533),
  ('a6dfec3d-386f-49de-90af-155f853f27ae'::uuid, 400, 533),
  ('8ee5be3b-64f3-41e5-8cef-8c07235b5f9f'::uuid, 400, 533),
  ('1b18135f-fe5f-4f60-99cb-5e00b413e61c'::uuid, 400, 533),
  ('6e9eee1e-fadd-489d-8ca9-1910c8cab8f1'::uuid, 400, 500),
  ('bd90989f-9f47-40f6-8578-75d6310a83a4'::uuid, 400, 533),
  ('27f55acb-498f-40e8-bf63-cf2a7c45bfd8'::uuid, 400, 500),
  ('9e5c0212-f222-4fac-8058-17dd95d75e3e'::uuid, 400, 533),
  ('9fabeb50-8452-4040-a2f9-4b1ff2799869'::uuid, 400, 500),
  ('94b9b051-8bf2-423b-b2f8-326a9f4c1151'::uuid, 400, 500),
  ('0b48af26-740d-4ded-befe-67604da3b9f4'::uuid, 400, 533),
  ('267ffb73-be3b-4d28-ad4a-699db61fb98c'::uuid, 400, 500),
  ('18f9f851-4808-4cf6-9763-987cfd99adb3'::uuid, 400, 400),
  ('949f10e4-d1e7-49d0-928a-1b0f6f34ccb8'::uuid, 400, 533),
  ('3ee33f20-7c90-42c7-b841-d78d56cf209e'::uuid, 400, 500),
  ('7e98b632-ac89-4f9a-b630-ad09594106bf'::uuid, 400, 437),
  ('3afe9ed4-81d0-4538-8433-99971142b58a'::uuid, 400, 500),
  ('89dd6673-c599-4c6b-a0b0-b4f57c3a9881'::uuid, 400, 400),
  ('d7cd8c22-358b-40ac-8934-a5faf102d26e'::uuid, 400, 334)
) as v(id, width, height)
where g.id = v.id and g.width is null;

-- Photos whose caption already names a folder. Everything else waits for Dee.
update public.gallery_photos set folder = '3d' where folder is null and caption ilike '3d cake%';
update public.gallery_photos set folder = 'custom-cookies' where folder is null and caption ilike 'custom cookies%';
update public.gallery_photos set folder = 'custom-donuts' where folder is null and caption ilike 'custom donuts%';
update public.gallery_photos set folder = 'pg18' where folder is null and caption ilike 'pg%';
