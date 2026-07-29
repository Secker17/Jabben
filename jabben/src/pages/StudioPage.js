import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../context/AuthContext';
import { useGallery } from '../context/GalleryContext';
import { fallbackPhotos } from '../data/portfolio';
import {
  deletePhoto,
  MAX_IMAGE_SIZE,
  PHOTO_CATEGORIES,
  replacePhoto,
  subscribeToManagedPhotos,
  updatePhoto,
  uploadPhoto,
} from '../services/galleryService';
import {
  replaceSiteImage,
  SITE_IMAGE_SLOTS,
} from '../services/siteImageService';

const currentYear = new Date().getFullYear();
const imageAccept = 'image/jpeg,image/png,image/webp,image/avif';
const studioSections = [
  { id: 'library', label: 'Image library', number: '01' },
  { id: 'upload', label: 'New upload', number: '02' },
  { id: 'site-images', label: 'Site images', number: '03' },
  { id: 'account', label: 'Account', number: '04' },
];

const initialForm = () => ({
  title: '',
  artist: '',
  alt: '',
  category: PHOTO_CATEGORIES[0],
  year: currentYear,
  featured: false,
  published: true,
});

const photoDraft = (photo) => ({
  title: photo.title || '',
  artist: photo.artist || photo.title || '',
  alt: photo.alt || '',
  category: photo.category || PHOTO_CATEGORIES[0],
  year: photo.year || currentYear,
  featured: Boolean(photo.featured),
  published: photo.published !== false,
});

const friendlyError = (error) => {
  const messages = {
    'auth/email-already-in-use':
      'That email already belongs to a Firebase user.',
    'auth/invalid-credential': 'Incorrect email address or password.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/requires-recent-login':
      'For security, sign out and sign in again before changing the password.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/weak-password': 'Use a stronger password with at least 8 characters.',
    'auth/wrong-password': 'The current password is incorrect.',
    'auth/too-many-requests':
      'Too many attempts. Please wait a moment before trying again.',
    'auth/network-request-failed':
      'Unable to connect to Firebase. Check your connection and try again.',
    'auth/missing-email': 'Enter your email address first.',
    'auth/missing-credentials': 'Enter both your email address and password.',
    'auth/not-admin': 'Only an administrator can create studio users.',
    'permission-denied':
      'You do not have permission to make this Firestore change.',
    'user-admin/not-owner':
      'This account is not the configured Studio owner.',
    'upload/invalid-input': error?.message,
    'firebase/not-configured': 'Firebase has not been configured yet.',
  };

  return (
    messages[error?.code] ||
    error?.message ||
    'Something went wrong. Please try again in a moment.'
  );
};

const validateImage = (file) => {
  if (!file?.type || !file.type.startsWith('image/')) {
    return 'Choose an image in JPG, PNG, WebP, or AVIF format.';
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return 'The image must be no larger than 15 MB.';
  }

  return '';
};

const getPhotoArtist = (photo) =>
  (photo.artist || photo.title || 'Uncategorized').trim();

const getAssetUrl = (asset, fallback = '') =>
  typeof asset === 'string' ? asset : asset?.url || fallback;

const getSlotId = (slot) => slot.id || slot.key || slot.slot;

const getSlotFallbackUrl = (slot) =>
  slot.fallbackUrl || slot.defaultUrl || slot.url || '';

const getSlotFallbackAlt = (slot) =>
  slot.fallbackAlt || slot.defaultAlt || slot.alt || slot.label || '';

const userAccessLevels = [
  { id: 'none', label: 'No access' },
  { id: 'studio', label: 'Studio' },
  { id: 'admin', label: 'Admin' },
];

const getUserAccessLevel = (accessUser) => {
  if (accessUser?.admin) return 'admin';
  if (accessUser?.studio) return 'studio';
  return 'none';
};

const useObjectUrl = (file) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!file) {
      setUrl('');
      return undefined;
    }

    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return url;
};

const mergeManagedPhotos = (firebasePhotos) => {
  const fallbackById = new Map(
    fallbackPhotos.map((photo) => [String(photo.id), photo]),
  );
  const claimedLegacyIds = new Set();

  const managedPhotos = firebasePhotos.map((photo) => {
    const legacyId =
      photo.legacyId === undefined || photo.legacyId === null
        ? ''
        : String(photo.legacyId);
    const fallback = legacyId ? fallbackById.get(legacyId) : null;

    if (legacyId) {
      claimedLegacyIds.add(legacyId);
    }

    return {
      ...(fallback || {}),
      ...photo,
      artist: photo.artist || fallback?.artist || fallback?.title || photo.title,
      fallbackUrl: fallback?.url || '',
      legacyId: legacyId || undefined,
      managed: photo.managed !== false,
    };
  });

  const originals = fallbackPhotos
    .filter((photo) => !claimedLegacyIds.has(String(photo.id)))
    .map((photo) => ({
      ...photo,
      id: `legacy:${photo.id}`,
      legacyId: String(photo.id),
      artist: photo.artist || photo.title,
      fallbackUrl: photo.url,
      managed: false,
    }));

  return [...managedPhotos, ...originals];
};

const ArrowIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);

const UploadIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4h14v-4" />
  </svg>
);

const CheckIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const EditIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="m4 20 4.1-.8L19 8.3 15.7 5 4.8 15.9 4 20ZM13.8 6.9l3.3 3.3" />
  </svg>
);

const TrashIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
  </svg>
);

const RestoreIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 8v5h5M5.5 12a7 7 0 1 0 2-5M4 8l3.5-3.5" />
  </svg>
);

function Brand({ dark = false }) {
  return (
    <BrandLink
      href="/"
      $dark={dark}
      aria-label="Julian Bjørgen — return to the home page"
    >
      <BrandMark $dark={dark}>J</BrandMark>
      <span>
        JULIAN BJØRGEN
        <small>PHOTO / STUDIO</small>
      </span>
    </BrandLink>
  );
}

function LoadingView() {
  return (
    <LoadingShell>
      <Brand dark />
      <Loader aria-label="Loading studio">
        <i />
        <i />
        <i />
      </Loader>
    </LoadingShell>
  );
}

function SetupView() {
  return (
    <SetupShell>
      <SetupTop>
        <Brand dark />
        <BackLink href="/">
          Back to portfolio <ArrowIcon />
        </BackLink>
      </SetupTop>
      <SetupContent>
        <Eyebrow>Studio / setup</Eyebrow>
        <SetupTitle>
          The studio is ready.
          <br />
          Firebase needs setup.
        </SetupTitle>
        <SetupCopy>
          The public portfolio works without configuration. To enable the
          studio, copy <code>.env.example</code> to <code>.env.local</code> and
          add the values from Firebase Console.
        </SetupCopy>
        <SetupSteps>
          <li>
            <span>01</span>
            Create a web app in your Firebase project.
          </li>
          <li>
            <span>02</span>
            Enable Email/Password under Authentication.
          </li>
          <li>
            <span>03</span>
            Create Firestore and deploy the included Firestore rules. Images
            are compressed and saved directly in Firestore.
          </li>
        </SetupSteps>
      </SetupContent>
      <SetupIndex aria-hidden="true">00</SetupIndex>
    </SetupShell>
  );
}

function LoginView() {
  const { login, resetPassword } = useAuth();
  const { getSiteImage } = useGallery();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const studioLoginSlot = SITE_IMAGE_SLOTS.find(
    (slot) => getSlotId(slot) === 'studioLogin',
  );
  const loginAsset = getSiteImage?.('studioLogin');
  const loginImage = getAssetUrl(
    loginAsset,
    getSlotFallbackUrl(studioLoginSlot || {}),
  );

  const handleLogin = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');

    try {
      await login(email, password);
    } catch (nextError) {
      setError(friendlyError(nextError));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setBusy(true);
    setError('');
    setNotice('');

    try {
      await resetPassword(email);
      setNotice('Check your inbox for the password reset link from Firebase.');
    } catch (nextError) {
      setError(friendlyError(nextError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LoginShell>
      <LoginVisual $image={loginImage}>
        <LoginOverlay />
        <LoginTop>
          <Brand />
          <BackLink href="/" $light>
            Back to portfolio <ArrowIcon />
          </BackLink>
        </LoginTop>
        <LoginQuote>
          <span>Private workspace</span>
          <blockquote>
            New moments,
            <br />
            the same eye.
          </blockquote>
          <p>Curate, publish, and keep the portfolio alive.</p>
        </LoginQuote>
        <FrameLabel>JULIAN BJØRGEN / STUDIO ACCESS</FrameLabel>
      </LoginVisual>

      <LoginPanel>
        <LoginCard>
          <Eyebrow>Photographer access only</Eyebrow>
          <LoginTitle>Sign in to the studio</LoginTitle>
          <LoginIntro>
            Use the email account created by a studio administrator.
          </LoginIntro>

          <LoginForm onSubmit={handleLogin} noValidate>
            <Field>
              <label htmlFor="studio-email">Email</label>
              <input
                id="studio-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="photographer@example.com"
                disabled={busy}
                required
              />
            </Field>
            <Field>
              <FieldHeading>
                <label htmlFor="studio-password">Password</label>
                <TextButton type="button" onClick={handleReset} disabled={busy}>
                  Forgot password?
                </TextButton>
              </FieldHeading>
              <input
                id="studio-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                disabled={busy}
                required
              />
            </Field>

            {error && (
              <FormMessage $error role="alert">
                {error}
              </FormMessage>
            )}
            {notice && <FormMessage role="status">{notice}</FormMessage>}

            <PrimaryButton type="submit" disabled={busy}>
              <span>{busy ? 'Signing in…' : 'Enter studio'}</span>
              <ArrowIcon />
            </PrimaryButton>
          </LoginForm>
        </LoginCard>

        <LoginFooter>
          <span>Firebase-secured studio</span>
          <span>JULIAN BJØRGEN © {currentYear}</span>
        </LoginFooter>
      </LoginPanel>
    </LoginShell>
  );
}

function AccessDeniedView() {
  const { user, logout, refreshClaims } = useAuth();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleRefresh = async () => {
    setBusy('refresh');
    setError('');
    setNotice('');

    try {
      const nextClaims = await refreshClaims();
      if (nextClaims?.studio === true || nextClaims?.admin === true) {
        setNotice('Access confirmed. Opening the studio…');
      } else {
        setNotice(
          'This account still has no active Studio access record. Ask an administrator to add it.',
        );
      }
    } catch (nextError) {
      setError(friendlyError(nextError));
    } finally {
      setBusy('');
    }
  };

  const handleLogout = async () => {
    setBusy('logout');
    setError('');
    setNotice('');

    try {
      await logout();
    } catch (nextError) {
      setError(friendlyError(nextError));
      setBusy('');
    }
  };

  return (
    <DeniedShell>
      <SetupTop>
        <Brand dark />
        <BackLink href="/">
          Back to portfolio <ArrowIcon />
        </BackLink>
      </SetupTop>
      <DeniedContent>
        <Eyebrow>Studio / restricted</Eyebrow>
        <DeniedTitle>This account does not have studio access.</DeniedTitle>
        <SetupCopy>
          You are signed in to Firebase, but this user does not have an active
          Studio access record in Firestore. No portfolio or account-management
          tools have been opened.
        </SetupCopy>
        <DeniedAccount>
          <span>Signed in as</span>
          <strong>{user?.email}</strong>
        </DeniedAccount>
        <DeniedGuidance>
          <li>
            <span>Existing user</span>
            Ask a Studio administrator to create or approve the account, then
            check access again.
          </li>
          <li>
            <span>First owner</span>
            Set <code>REACT_APP_STUDIO_OWNER_EMAIL</code>, deploy the Firestore
            rules, and sign in with that exact email once. The owner access
            record is then created automatically.
          </li>
        </DeniedGuidance>
        {error && (
          <FormMessage $error role="alert">
            {error}
          </FormMessage>
        )}
        {notice && <FormMessage role="status">{notice}</FormMessage>}
        <DeniedActions>
          <PrimaryButton
            type="button"
            onClick={handleRefresh}
            disabled={Boolean(busy)}
          >
            <span>
              {busy === 'refresh' ? 'Checking…' : 'Check access again'}
            </span>
            <ArrowIcon />
          </PrimaryButton>
          <DeniedSignOut
            type="button"
            onClick={handleLogout}
            disabled={Boolean(busy)}
          >
            {busy === 'logout' ? 'Signing out…' : 'Sign out'}
          </DeniedSignOut>
        </DeniedActions>
      </DeniedContent>
      <SetupIndex aria-hidden="true">403</SetupIndex>
    </DeniedShell>
  );
}

function FileDropzone({
  file,
  previewUrl,
  onFile,
  disabled,
  inputId = 'studio-file',
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const acceptFile = (nextFile) => {
    if (nextFile) {
      onFile(nextFile);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    if (!disabled) {
      acceptFile(event.dataTransfer.files?.[0]);
    }
  };

  return (
    <Dropzone
      $dragging={dragging}
      $hasFile={Boolean(file)}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setDragging(false);
        }
      }}
      onDrop={handleDrop}
    >
      <HiddenInput
        ref={inputRef}
        id={inputId}
        type="file"
        accept={imageAccept}
        onChange={(event) => acceptFile(event.target.files?.[0])}
        disabled={disabled}
      />

      {previewUrl ? (
        <>
          <PreviewImage src={previewUrl} alt="" />
          <PreviewShade />
          <FileDetails>
            <FileBadge>
              <CheckIcon />
            </FileBadge>
            <span>
              <strong>{file.name}</strong>
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </span>
          </FileDetails>
          <ChangeFile
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            Change image
          </ChangeFile>
        </>
      ) : (
        <EmptyDrop>
          <UploadBadge>
            <UploadIcon />
          </UploadBadge>
          <strong>Drop an image here</strong>
          <span>or select a file from your computer</span>
          <ChooseFile
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            Choose image
          </ChooseFile>
          <small>
            JPG, PNG, WEBP, or AVIF · max 15 MB · compressed for Firestore
          </small>
        </EmptyDrop>
      )}
    </Dropzone>
  );
}

function UploadPanel() {
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const previewUrl = useObjectUrl(file);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const updateField = (event) => {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const selectFile = (nextFile) => {
    setError('');
    setNotice('');
    const validationMessage = validateImage(nextFile);

    if (validationMessage) {
      setFile(null);
      setError(validationMessage);
      return;
    }

    setFile(nextFile);

    if (!form.alt) {
      const suggestedAlt = nextFile.name
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .trim();
      setForm((current) => ({ ...current, alt: suggestedAlt }));
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!file) {
      setError('Choose an image before publishing.');
      return;
    }

    if (!form.artist.trim()) {
      setError('Add an artist so the image can be grouped in the portfolio.');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      await uploadPhoto({ file, ...form }, setProgress);
      setNotice(
        form.published
          ? `Uploaded and published under ${form.artist.trim()}.`
          : `Saved under ${form.artist.trim()} as an unpublished image.`,
      );
      setFile(null);
      setForm(initialForm());
    } catch (nextError) {
      setError(friendlyError(nextError));
    } finally {
      setUploading(false);
    }
  };

  return (
    <SectionLayout>
      <UploadCard>
        <CardHeader>
          <span>New portfolio image</span>
          <small>UPLOAD / FIREBASE</small>
        </CardHeader>

        <UploadForm onSubmit={handleUpload}>
          <FileDropzone
            file={file}
            previewUrl={previewUrl}
            onFile={selectFile}
            disabled={uploading}
            inputId="new-photo-file"
          />

          <FormGrid>
            <Field>
              <label htmlFor="photo-artist">Artist / subject</label>
              <input
                id="photo-artist"
                name="artist"
                value={form.artist}
                onChange={updateField}
                placeholder="For example: Ed Sheeran"
                maxLength="100"
                disabled={uploading}
                required
              />
            </Field>
            <Field>
              <label htmlFor="photo-title">Image title</label>
              <input
                id="photo-title"
                name="title"
                value={form.title}
                onChange={updateField}
                placeholder="For example: Oslo, night one"
                maxLength="100"
                disabled={uploading}
                required
              />
            </Field>
            <Field $wide>
              <label htmlFor="photo-alt">
                Alt text <small>for accessibility</small>
              </label>
              <input
                id="photo-alt"
                name="alt"
                value={form.alt}
                onChange={updateField}
                placeholder="Briefly describe what the image shows"
                maxLength="180"
                disabled={uploading}
                required
              />
            </Field>
            <Field>
              <label htmlFor="photo-category">Category</label>
              <SelectWrap>
                <select
                  id="photo-category"
                  name="category"
                  value={form.category}
                  onChange={updateField}
                  disabled={uploading}
                >
                  {PHOTO_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <span aria-hidden="true">⌄</span>
              </SelectWrap>
            </Field>
            <Field>
              <label htmlFor="photo-year">Year</label>
              <input
                id="photo-year"
                name="year"
                type="number"
                min="1900"
                max={currentYear + 1}
                value={form.year}
                onChange={updateField}
                disabled={uploading}
                required
              />
            </Field>
          </FormGrid>

          <ToggleGroup>
            <ToggleLabel>
              <input
                type="checkbox"
                name="published"
                checked={form.published}
                onChange={updateField}
                disabled={uploading}
              />
              <ToggleTrack>
                <i />
              </ToggleTrack>
              <span>
                <strong>Publish now</strong>
                Make it visible in the portfolio immediately
              </span>
            </ToggleLabel>
            <ToggleLabel>
              <input
                type="checkbox"
                name="featured"
                checked={form.featured}
                onChange={updateField}
                disabled={uploading}
              />
              <ToggleTrack>
                <i />
              </ToggleTrack>
              <span>
                <strong>Featured</strong>
                Eligible for prominent portfolio positions
              </span>
            </ToggleLabel>
          </ToggleGroup>

          {uploading && (
            <ProgressWrap aria-live="polite">
              <ProgressMeta>
                <span>Compressing and saving to Firestore</span>
                <strong>{progress}%</strong>
              </ProgressMeta>
              <ProgressTrack>
                <i style={{ width: `${progress}%` }} />
              </ProgressTrack>
            </ProgressWrap>
          )}

          {error && (
            <FormMessage $error role="alert">
              {error}
            </FormMessage>
          )}
          {notice && <FormMessage role="status">{notice}</FormMessage>}

          <PublishButton type="submit" disabled={uploading}>
            <span>{uploading ? 'Uploading…' : 'Upload image'}</span>
            <UploadIcon />
          </PublishButton>
        </UploadForm>
      </UploadCard>

      <SideColumn>
        <InfoCard $accent>
          <CardHeader>
            <span>How grouping works</span>
            <small>ARTISTS</small>
          </CardHeader>
          <InfoBody>
            <BigIndex>01</BigIndex>
            <p>
              Use the exact same artist name on every related image. Visitors
              can then open that artist and see the complete set.
            </p>
          </InfoBody>
        </InfoCard>
        <TipCard>
          <span>STUDIO NOTE / ACCESSIBILITY</span>
          <p>
            Describe the visible moment in the alt text. The artist and title
            are already shown separately.
          </p>
        </TipCard>
      </SideColumn>
    </SectionLayout>
  );
}

function PhotoCard({ photo }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => photoDraft(photo));
  const [replacementFile, setReplacementFile] = useState(null);
  const replacementPreview = useObjectUrl(replacementFile);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setDraft(photoDraft(photo));
    setReplacementFile(null);
    setEditing(false);
    setConfirmingDelete(false);
  }, [photo]);

  const updateField = (event) => {
    const { name, type, checked, value } = event.target;
    setDraft((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const chooseReplacement = (nextFile) => {
    if (!nextFile) return;
    const validationMessage = validateImage(nextFile);
    setError('');
    setNotice('');

    if (validationMessage) {
      setReplacementFile(null);
      setError(validationMessage);
      return;
    }

    setReplacementFile(nextFile);
    setEditing(true);
  };

  const saveChanges = async () => {
    setError('');
    setNotice('');

    if (!draft.artist.trim()) {
      setError('Add an artist before saving.');
      return;
    }

    if (!draft.title.trim() || !draft.alt.trim()) {
      setError('Add both an image title and alt text before saving.');
      return;
    }

    if (!photo.managed && !replacementFile) {
      setError(
        'Choose a replacement file to create an editable Firebase version of this original.',
      );
      return;
    }

    setBusy(true);
    setProgress(0);

    try {
      if (!photo.managed) {
        await uploadPhoto(
          {
            file: replacementFile,
            ...draft,
            legacyId: photo.legacyId,
          },
          setProgress,
        );
        setNotice('The original now has an editable Firebase replacement.');
      } else {
        if (replacementFile) {
          await replacePhoto(photo, replacementFile, setProgress);
        }

        await updatePhoto(photo.id, draft);
        setNotice(
          replacementFile
            ? 'Image and details updated.'
            : 'Image details updated.',
        );
      }

      setReplacementFile(null);
      setEditing(false);
    } catch (nextError) {
      setError(friendlyError(nextError));
    } finally {
      setBusy(false);
    }
  };

  const removeOrRestore = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      setNotice('');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');

    try {
      await deletePhoto(photo);
    } catch (nextError) {
      setError(friendlyError(nextError));
      setConfirmingDelete(false);
      setBusy(false);
    }
  };

  const cancelEdit = () => {
    setDraft(photoDraft(photo));
    setReplacementFile(null);
    setEditing(false);
    setError('');
    setNotice('');
  };

  const imageUrl =
    replacementPreview ||
    photo.thumbnailUrl ||
    photo.url ||
    photo.imageUrl ||
    photo.fallbackUrl;
  const isOriginal = !photo.managed;
  const restoresOriginal = Boolean(photo.managed && photo.legacyId);

  return (
    <PhotoCardShell>
      <PhotoVisual>
        <img
          src={imageUrl}
          alt={photo.alt || photo.title}
          width="760"
          height="570"
          loading="lazy"
        />
        <PhotoBadges>
          <PhotoBadge $warm={photo.featured}>
            {photo.featured ? 'Featured' : photo.category}
          </PhotoBadge>
          <PhotoBadge>
            {isOriginal ? 'Original' : photo.published ? 'Live' : 'Draft'}
          </PhotoBadge>
        </PhotoBadges>
        {busy && (
          <PhotoBusy aria-live="polite">
            <span>{progress > 0 ? `${progress}%` : 'Saving…'}</span>
          </PhotoBusy>
        )}
      </PhotoVisual>

      <PhotoCardBody>
        {!editing ? (
          <>
            <PhotoMeta>
              <span>{getPhotoArtist(photo)}</span>
              <h3>{photo.title}</h3>
              <small>
                {photo.category} / {photo.year}
              </small>
            </PhotoMeta>
            <PhotoActionRow>
              <SmallButton
                type="button"
                onClick={() => setEditing(true)}
                disabled={busy}
              >
                <EditIcon />
                {isOriginal ? 'Replace / edit' : 'Edit'}
              </SmallButton>
              {photo.managed && (
                <DangerButton
                  type="button"
                  onClick={removeOrRestore}
                  disabled={busy}
                  $confirm={confirmingDelete}
                >
                  {restoresOriginal ? <RestoreIcon /> : <TrashIcon />}
                  {confirmingDelete
                    ? restoresOriginal
                      ? 'Confirm restore'
                      : 'Confirm delete'
                    : restoresOriginal
                      ? 'Restore original'
                      : 'Delete'}
                </DangerButton>
              )}
              {confirmingDelete && (
                <QuietButton
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={busy}
                >
                  Cancel
                </QuietButton>
              )}
            </PhotoActionRow>
          </>
        ) : (
          <PhotoEditForm
            onSubmit={(event) => {
              event.preventDefault();
              saveChanges();
            }}
          >
            <CompactGrid>
              <CompactField>
                <label htmlFor={`artist-${photo.id}`}>Artist / subject</label>
                <input
                  id={`artist-${photo.id}`}
                  name="artist"
                  value={draft.artist}
                  onChange={updateField}
                  maxLength="100"
                  disabled={busy}
                  required
                />
              </CompactField>
              <CompactField>
                <label htmlFor={`title-${photo.id}`}>Image title</label>
                <input
                  id={`title-${photo.id}`}
                  name="title"
                  value={draft.title}
                  onChange={updateField}
                  maxLength="100"
                  disabled={busy}
                  required
                />
              </CompactField>
              <CompactField $wide>
                <label htmlFor={`alt-${photo.id}`}>Alt text</label>
                <textarea
                  id={`alt-${photo.id}`}
                  name="alt"
                  value={draft.alt}
                  onChange={updateField}
                  maxLength="180"
                  rows="3"
                  disabled={busy}
                  required
                />
              </CompactField>
              <CompactField>
                <label htmlFor={`category-${photo.id}`}>Category</label>
                <select
                  id={`category-${photo.id}`}
                  name="category"
                  value={draft.category}
                  onChange={updateField}
                  disabled={busy}
                >
                  {PHOTO_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </CompactField>
              <CompactField>
                <label htmlFor={`year-${photo.id}`}>Year</label>
                <input
                  id={`year-${photo.id}`}
                  name="year"
                  type="number"
                  min="1900"
                  max={currentYear + 1}
                  value={draft.year}
                  onChange={updateField}
                  disabled={busy}
                />
              </CompactField>
            </CompactGrid>

            <MiniToggles>
              <ToggleLabel>
                <input
                  type="checkbox"
                  name="published"
                  checked={draft.published}
                  onChange={updateField}
                  disabled={busy}
                />
                <ToggleTrack>
                  <i />
                </ToggleTrack>
                <span>
                  <strong>Published</strong>
                </span>
              </ToggleLabel>
              <ToggleLabel>
                <input
                  type="checkbox"
                  name="featured"
                  checked={draft.featured}
                  onChange={updateField}
                  disabled={busy}
                />
                <ToggleTrack>
                  <i />
                </ToggleTrack>
                <span>
                  <strong>Featured</strong>
                </span>
              </ToggleLabel>
            </MiniToggles>

            <ReplacementRow>
              <HiddenInput
                ref={fileInputRef}
                type="file"
                accept={imageAccept}
                onChange={(event) =>
                  chooseReplacement(event.target.files?.[0])
                }
                disabled={busy}
              />
              <SmallButton
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                <UploadIcon />
                {replacementFile
                  ? 'Choose another file'
                  : isOriginal
                    ? 'Choose replacement'
                    : 'Replace image file'}
              </SmallButton>
              <span>
                {replacementFile
                  ? replacementFile.name
                  : isOriginal
                    ? 'A new file is required for original images.'
                    : 'Keep the current file or choose a new one.'}
              </span>
            </ReplacementRow>

            {busy && progress > 0 && (
              <ProgressTrack aria-label={`Upload ${progress}% complete`}>
                <i style={{ width: `${progress}%` }} />
              </ProgressTrack>
            )}
            {error && (
              <InlineMessage $error role="alert">
                {error}
              </InlineMessage>
            )}
            {notice && (
              <InlineMessage role="status">{notice}</InlineMessage>
            )}

            <EditActions>
              <SmallButton type="submit" $filled disabled={busy}>
                <CheckIcon />
                {busy
                  ? 'Saving…'
                  : isOriginal
                    ? 'Create replacement'
                    : 'Save changes'}
              </SmallButton>
              <QuietButton type="button" onClick={cancelEdit} disabled={busy}>
                Cancel
              </QuietButton>
            </EditActions>
          </PhotoEditForm>
        )}

        {!editing && error && (
          <InlineMessage $error role="alert">
            {error}
          </InlineMessage>
        )}
        {!editing && notice && (
          <InlineMessage role="status">{notice}</InlineMessage>
        )}
      </PhotoCardBody>
    </PhotoCardShell>
  );
}

function LibraryPanel({ photos, galleryError }) {
  const [artist, setArtist] = useState('all');
  const [category, setCategory] = useState('all');

  const artists = useMemo(() => {
    const counts = new Map();

    photos.forEach((photo) => {
      const name = getPhotoArtist(photo);
      counts.set(name, (counts.get(name) || 0) + 1);
    });

    return [...counts.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }, [photos]);

  const categories = useMemo(
    () =>
      [...new Set(photos.map((photo) => photo.category).filter(Boolean))].sort(),
    [photos],
  );

  const filteredPhotos = useMemo(
    () =>
      photos.filter((photo) => {
        const artistMatches =
          artist === 'all' || getPhotoArtist(photo) === artist;
        const categoryMatches =
          category === 'all' || photo.category === category;
        return artistMatches && categoryMatches;
      }),
    [artist, category, photos],
  );

  return (
    <LibrarySection>
      <LibraryTop>
        <div>
          <Eyebrow>Portfolio manager</Eyebrow>
          <SectionTitle>Images by artist</SectionTitle>
          <SectionCopy>
            Pick an artist to see the complete collection, then edit,
            publish, feature, replace, or restore individual images.
          </SectionCopy>
        </div>
        <LibraryStats>
          <strong>{photos.length}</strong>
          <span>images in studio</span>
          <small>{galleryError ? 'SYNC UNAVAILABLE' : 'FIREBASE SYNCED'}</small>
        </LibraryStats>
      </LibraryTop>

      <FilterBlock>
        <FilterHeading>
          <span>Artist</span>
          <small>Click Ed Sheeran to see every Ed Sheeran image</small>
        </FilterHeading>
        <FilterChips role="group" aria-label="Filter images by artist">
          <FilterChip
            type="button"
            $active={artist === 'all'}
            aria-pressed={artist === 'all'}
            onClick={() => setArtist('all')}
          >
            All artists <span>{photos.length}</span>
          </FilterChip>
          {artists.map(([name, count]) => (
            <FilterChip
              key={name}
              type="button"
              $active={artist === name}
              aria-pressed={artist === name}
              onClick={() => setArtist(name)}
            >
              {name} <span>{count}</span>
            </FilterChip>
          ))}
        </FilterChips>
      </FilterBlock>

      <LibraryToolbar>
        <p aria-live="polite">
          Showing <strong>{filteredPhotos.length}</strong>{' '}
          {artist === 'all' ? 'images' : `images for ${artist}`}
        </p>
        <label>
          <span>Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </LibraryToolbar>

      {filteredPhotos.length > 0 ? (
        <PhotoGrid>
          {filteredPhotos.map((photo) => (
            <PhotoCard
              key={`${photo.managed ? 'managed' : 'original'}-${photo.id}`}
              photo={photo}
            />
          ))}
        </PhotoGrid>
      ) : (
        <EmptyLibrary>
          <span>No images match these filters.</span>
          <button
            type="button"
            onClick={() => {
              setArtist('all');
              setCategory('all');
            }}
          >
            Clear filters
          </button>
        </EmptyLibrary>
      )}
    </LibrarySection>
  );
}

function SiteImageCard({ slot, getSiteImage }) {
  const slotId = getSlotId(slot);
  const asset = getSiteImage?.(slotId);
  const currentUrl = getAssetUrl(asset, getSlotFallbackUrl(slot));
  const currentAlt =
    (typeof asset === 'object' && asset?.alt) || getSlotFallbackAlt(slot);
  const [file, setFile] = useState(null);
  const previewUrl = useObjectUrl(file);
  const [alt, setAlt] = useState(currentAlt);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setAlt(currentAlt);
    }
  }, [currentAlt, file]);

  const chooseFile = (nextFile) => {
    if (!nextFile) return;
    const validationMessage = validateImage(nextFile);
    setError('');
    setNotice('');

    if (validationMessage) {
      setFile(null);
      setError(validationMessage);
      return;
    }

    setFile(nextFile);
  };

  const saveImage = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!file) {
      setError('Choose a replacement image first.');
      return;
    }

    if (!alt.trim()) {
      setError('Add alt text before saving this site image.');
      return;
    }

    setBusy(true);
    setProgress(0);

    try {
      await replaceSiteImage(slotId, file, { alt: alt.trim() }, setProgress);
      setFile(null);
      setNotice('Site image replaced. The live page will update automatically.');
    } catch (nextError) {
      setError(friendlyError(nextError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteSlotCard>
      <SiteSlotVisual>
        <img
          src={previewUrl || currentUrl}
          alt={previewUrl ? '' : currentAlt}
          width="900"
          height="580"
          loading="lazy"
        />
        <SiteSlotLabel>
          <span>{slot.label || slotId}</span>
          <small>{file ? 'NEW PREVIEW' : 'CURRENT IMAGE'}</small>
        </SiteSlotLabel>
      </SiteSlotVisual>
      <SiteSlotForm onSubmit={saveImage}>
        <p>{slot.description || 'A fixed image used on the public website.'}</p>
        <CompactField>
          <label htmlFor={`slot-alt-${slotId}`}>Alt text</label>
          <textarea
            id={`slot-alt-${slotId}`}
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            rows="2"
            maxLength="180"
            disabled={busy}
            required
          />
        </CompactField>
        <HiddenInput
          ref={inputRef}
          type="file"
          accept={imageAccept}
          onChange={(event) => chooseFile(event.target.files?.[0])}
          disabled={busy}
        />
        <SiteSlotActions>
          <SmallButton
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <UploadIcon />
            {file ? 'Choose another' : 'Choose new image'}
          </SmallButton>
          <SmallButton type="submit" $filled disabled={busy || !file}>
            <CheckIcon />
            {busy ? 'Saving…' : 'Save replacement'}
          </SmallButton>
        </SiteSlotActions>
        {file && <ChosenFile title={file.name}>{file.name}</ChosenFile>}
        {busy && (
          <ProgressTrack aria-label={`Upload ${progress}% complete`}>
            <i style={{ width: `${progress}%` }} />
          </ProgressTrack>
        )}
        {error && (
          <InlineMessage $error role="alert">
            {error}
          </InlineMessage>
        )}
        {notice && <InlineMessage role="status">{notice}</InlineMessage>}
      </SiteSlotForm>
    </SiteSlotCard>
  );
}

function SiteImagesPanel() {
  const { getSiteImage } = useGallery();

  return (
    <LibrarySection>
      <LibraryTop>
        <div>
          <Eyebrow>Site image manager</Eyebrow>
          <SectionTitle>Every fixed image, in one place</SectionTitle>
          <SectionCopy>
            Replace hero, About, and Studio imagery without editing code. Each
            slot shows where the image is used.
          </SectionCopy>
        </div>
        <LibraryStats>
          <strong>{SITE_IMAGE_SLOTS.length}</strong>
          <span>editable image slots</span>
          <small>LIVE SITE ASSETS</small>
        </LibraryStats>
      </LibraryTop>
      <SiteSlotGrid>
        {SITE_IMAGE_SLOTS.map((slot) => (
          <SiteImageCard
            key={getSlotId(slot)}
            slot={slot}
            getSiteImage={getSiteImage}
          />
        ))}
      </SiteSlotGrid>
    </LibrarySection>
  );
}

const generateTemporaryPassword = () => {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const values = new Uint32Array(16);
  window.crypto.getRandomValues(values);
  return [...values].map((value) => alphabet[value % alphabet.length]).join('');
};

function AccessUserRow({
  accessUser,
  currentUserId,
  busy,
  onAccessChange,
}) {
  const currentLevel = getUserAccessLevel(accessUser);
  const isCurrentUser = accessUser.uid === currentUserId;
  const accessLocked = Boolean(accessUser.isOwner || isCurrentUser);
  const displayName =
    accessUser.displayName?.trim() ||
    accessUser.email?.split('@')[0] ||
    'Firebase user';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <UserAccessRow $disabled={accessUser.disabled}>
      <UserAvatar aria-hidden="true">{initial}</UserAvatar>
      <UserAccessIdentity>
        <UserNameLine>
          <strong>{displayName}</strong>
          {isCurrentUser && <UserTag>YOU</UserTag>}
          {accessUser.isOwner && <UserTag $owner>OWNER</UserTag>}
          {accessUser.disabled && <UserTag>DISABLED</UserTag>}
        </UserNameLine>
        <span>{accessUser.email || 'No email address'}</span>
        <small>
          {accessUser.lastSignInAt
            ? `Last sign-in ${new Date(accessUser.lastSignInAt).toLocaleDateString()}`
            : 'No recorded sign-in'}
        </small>
      </UserAccessIdentity>
      <RolePicker
        role="group"
        aria-label={`Access level for ${accessUser.email || displayName}`}
      >
        {userAccessLevels.map((level) => (
          <RoleButton
            key={level.id}
            type="button"
            $active={currentLevel === level.id}
            onClick={() => onAccessChange(accessUser, level.id)}
            disabled={busy || accessLocked}
            aria-pressed={currentLevel === level.id}
          >
            {level.label}
          </RoleButton>
        ))}
      </RolePicker>
      <AccessState $level={currentLevel}>
        <i />
        <span>
          {accessLocked
            ? accessUser.isOwner
              ? 'Owner protected'
              : 'Current session'
            : busy
              ? 'Saving…'
              : currentLevel === 'none'
                ? 'Cannot open Studio'
                : currentLevel === 'admin'
                  ? 'Full user management'
                  : 'Can manage content'}
        </span>
      </AccessState>
    </UserAccessRow>
  );
}

function AccountPanel() {
  const {
    user,
    claims,
    isAdmin,
    createStudioUser,
    changePassword,
    listStudioUsers,
    updateStudioUserAccess,
  } = useAuth();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [userForm, setUserForm] = useState({
    displayName: '',
    email: '',
    password: '',
  });
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [userBusy, setUserBusy] = useState(false);
  const [userError, setUserError] = useState('');
  const [userNotice, setUserNotice] = useState('');
  const [accessUsers, setAccessUsers] = useState([]);
  const [accessSearch, setAccessSearch] = useState('');
  const [accessLoading, setAccessLoading] = useState(isAdmin);
  const [accessBusyUid, setAccessBusyUid] = useState('');
  const [accessError, setAccessError] = useState('');
  const [accessNotice, setAccessNotice] = useState('');

  const loadAccessUsers = useCallback(
    async ({ silent = false } = {}) => {
      if (!isAdmin) return;

      if (typeof listStudioUsers !== 'function') {
        setAccessLoading(false);
        setAccessError(
          'User management is unavailable until Firestore and its security rules are configured.',
        );
        return;
      }

      if (!silent) setAccessLoading(true);
      setAccessError('');

      try {
        const result = await listStudioUsers();
        const nextUsers = Array.isArray(result) ? result : result?.users || [];

        setAccessUsers(
          [...nextUsers].sort((left, right) => {
            if (left.isOwner !== right.isOwner) return left.isOwner ? -1 : 1;
            if (left.admin !== right.admin) return left.admin ? -1 : 1;

            return (left.displayName || left.email || '').localeCompare(
              right.displayName || right.email || '',
            );
          }),
        );
      } catch (nextError) {
        setAccessError(friendlyError(nextError));
      } finally {
        setAccessLoading(false);
      }
    },
    [isAdmin, listStudioUsers],
  );

  useEffect(() => {
    loadAccessUsers();
  }, [loadAccessUsers]);

  const filteredAccessUsers = useMemo(() => {
    const query = accessSearch.trim().toLowerCase();
    if (!query) return accessUsers;

    return accessUsers.filter((accessUser) =>
      [accessUser.displayName, accessUser.email]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [accessSearch, accessUsers]);

  const accessCounts = useMemo(
    () =>
      accessUsers.reduce(
        (counts, accessUser) => {
          const level = getUserAccessLevel(accessUser);
          counts[level] += 1;
          return counts;
        },
        { none: 0, studio: 0, admin: 0 },
      ),
    [accessUsers],
  );

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordNotice('');

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Use a new password with at least 8 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('The two new passwords do not match.');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('Choose a new password that is different from the old one.');
      return;
    }

    setPasswordBusy(true);

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordNotice('Your password has been changed.');
    } catch (nextError) {
      setPasswordError(friendlyError(nextError));
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setUserError('');
    setUserNotice('');

    if (userForm.password.length < 8) {
      setUserError('Use a temporary password with at least 8 characters.');
      return;
    }

    setUserBusy(true);

    try {
      await createStudioUser({
        displayName: userForm.displayName.trim(),
        email: userForm.email.trim(),
        password: userForm.password,
      });
      const createdEmail = userForm.email.trim();
      setUserForm({ displayName: '', email: '', password: '' });
      setShowTemporaryPassword(false);
      setUserNotice(
        `${createdEmail} can now sign in. Share the temporary password securely.`,
      );
      await loadAccessUsers({ silent: true });
    } catch (nextError) {
      setUserError(friendlyError(nextError));
    } finally {
      setUserBusy(false);
    }
  };

  const makePassword = () => {
    setUserForm((current) => ({
      ...current,
      password: generateTemporaryPassword(),
    }));
    setShowTemporaryPassword(true);
    setUserError('');
  };

  const handleAccessChange = async (accessUser, nextLevel) => {
    const currentLevel = getUserAccessLevel(accessUser);
    if (
      currentLevel === nextLevel ||
      accessUser.isOwner ||
      accessUser.uid === user?.uid ||
      typeof updateStudioUserAccess !== 'function'
    ) {
      return;
    }

    setAccessBusyUid(accessUser.uid);
    setAccessError('');
    setAccessNotice('');

    try {
      const result = await updateStudioUserAccess({
        uid: accessUser.uid,
        studio: nextLevel !== 'none',
        admin: nextLevel === 'admin',
      });
      const updatedUser = result?.user || result;

      setAccessUsers((current) =>
        current.map((candidate) =>
          candidate.uid === accessUser.uid
            ? { ...candidate, ...updatedUser }
            : candidate,
        ),
      );

      const nextLabel =
        nextLevel === 'none'
          ? 'no Studio access'
          : nextLevel === 'admin'
            ? 'administrator access'
            : 'Studio access';
      setAccessNotice(
        `${accessUser.email || accessUser.displayName} now has ${nextLabel}. The change takes effect immediately.`,
      );
    } catch (nextError) {
      setAccessError(friendlyError(nextError));
    } finally {
      setAccessBusyUid('');
    }
  };

  return (
    <LibrarySection>
      <LibraryTop>
        <div>
          <Eyebrow>Account & access</Eyebrow>
          <SectionTitle>Studio users</SectionTitle>
          <SectionCopy>
            Change your own password here. Administrators can also create
            additional Firebase studio accounts without leaving this page.
          </SectionCopy>
        </div>
        <AccountIdentity>
          <span>{user?.displayName || 'Studio user'}</span>
          <strong>{user?.email}</strong>
          <small>
            {isAdmin ? 'ADMINISTRATOR' : claims?.role?.toUpperCase() || 'STUDIO'}
          </small>
        </AccountIdentity>
      </LibraryTop>

      <AccountGrid>
        <AccountCard>
          <CardHeader>
            <span>Change my password</span>
            <small>EVERY USER</small>
          </CardHeader>
          <AccountForm onSubmit={handlePasswordChange}>
            <Field>
              <label htmlFor="current-password">Current password</label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
                disabled={passwordBusy}
                required
              />
            </Field>
            <Field>
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
                minLength="8"
                disabled={passwordBusy}
                required
              />
            </Field>
            <Field>
              <label htmlFor="confirm-password">Repeat new password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
                minLength="8"
                disabled={passwordBusy}
                required
              />
            </Field>
            {passwordError && (
              <FormMessage $error role="alert">
                {passwordError}
              </FormMessage>
            )}
            {passwordNotice && (
              <FormMessage role="status">{passwordNotice}</FormMessage>
            )}
            <PrimaryButton type="submit" disabled={passwordBusy}>
              <span>{passwordBusy ? 'Updating…' : 'Change password'}</span>
              <ArrowIcon />
            </PrimaryButton>
          </AccountForm>
        </AccountCard>

        {isAdmin ? (
          <AccountCard>
            <CardHeader>
              <span>Create studio user</span>
              <small>ADMIN ONLY</small>
            </CardHeader>
            <AccountForm onSubmit={handleCreateUser}>
              <Field>
                <label htmlFor="new-user-name">Name</label>
                <input
                  id="new-user-name"
                  value={userForm.displayName}
                  onChange={(event) =>
                    setUserForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  autoComplete="off"
                  maxLength="80"
                  disabled={userBusy}
                  placeholder="Photographer name"
                  required
                />
              </Field>
              <Field>
                <label htmlFor="new-user-email">Email</label>
                <input
                  id="new-user-email"
                  type="email"
                  value={userForm.email}
                  onChange={(event) =>
                    setUserForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  autoComplete="off"
                  disabled={userBusy}
                  placeholder="name@example.com"
                  required
                />
              </Field>
              <Field>
                <FieldHeading>
                  <label htmlFor="new-user-password">Temporary password</label>
                  <TextButton
                    type="button"
                    onClick={makePassword}
                    disabled={userBusy}
                  >
                    Generate secure password
                  </TextButton>
                </FieldHeading>
                <input
                  id="new-user-password"
                  type={showTemporaryPassword ? 'text' : 'password'}
                  value={userForm.password}
                  onChange={(event) =>
                    setUserForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  autoComplete="new-password"
                  minLength="8"
                  disabled={userBusy}
                  required
                />
                <PasswordTools>
                  <button
                    type="button"
                    onClick={() =>
                      setShowTemporaryPassword((current) => !current)
                    }
                    disabled={userBusy}
                  >
                    {showTemporaryPassword ? 'Hide password' : 'Show password'}
                  </button>
                  <span>The user should change it after signing in.</span>
                </PasswordTools>
              </Field>
              {userError && (
                <FormMessage $error role="alert">
                  {userError}
                </FormMessage>
              )}
              {userNotice && (
                <FormMessage role="status">{userNotice}</FormMessage>
              )}
              <PublishButton type="submit" disabled={userBusy}>
                <span>{userBusy ? 'Creating…' : 'Create Firebase user'}</span>
                <ArrowIcon />
              </PublishButton>
            </AccountForm>
          </AccountCard>
        ) : (
          <PermissionCard>
            <span>ADMIN ACCESS</span>
            <h3>User creation is hidden for this account.</h3>
            <p>
              Ask an administrator to create additional studio users. Your own
              password controls remain available.
            </p>
          </PermissionCard>
        )}
      </AccountGrid>

      {isAdmin && (
        <AccessManagerCard>
          <AccessManagerTop>
            <div>
              <Eyebrow>Firebase access</Eyebrow>
              <h3>Choose who can open Studio</h3>
              <p>
                Every user created through Studio is stored in Firebase
                Authentication and listed here. Grant content access, promote a
                trusted user to administrator, or remove Studio access without
                deleting their Firebase account.
              </p>
            </div>
            <AccessCounts aria-label="Current access totals">
              <span>
                <strong>{accessCounts.studio}</strong>
                Studio
              </span>
              <span>
                <strong>{accessCounts.admin}</strong>
                Admins
              </span>
              <span>
                <strong>{accessCounts.none}</strong>
                No access
              </span>
            </AccessCounts>
          </AccessManagerTop>

          <AccessToolbar>
            <AccessSearch>
              <label htmlFor="access-search">Find Firebase user</label>
              <input
                id="access-search"
                type="search"
                value={accessSearch}
                onChange={(event) => setAccessSearch(event.target.value)}
                placeholder="Search by name or email"
                autoComplete="off"
              />
            </AccessSearch>
            <AccessRefreshButton
              type="button"
              onClick={() => loadAccessUsers()}
              disabled={accessLoading || Boolean(accessBusyUid)}
            >
              {accessLoading ? 'Loading…' : 'Refresh users'}
            </AccessRefreshButton>
          </AccessToolbar>

          {accessError && (
            <AccessMessage $error role="alert">
              {accessError}
            </AccessMessage>
          )}
          {accessNotice && (
            <AccessMessage role="status">{accessNotice}</AccessMessage>
          )}

          {accessLoading ? (
            <AccessLoading role="status">
              <i />
              Loading Firebase users…
            </AccessLoading>
          ) : filteredAccessUsers.length > 0 ? (
            <UserAccessList>
              {filteredAccessUsers.map((accessUser) => (
                <AccessUserRow
                  key={accessUser.uid}
                  accessUser={accessUser}
                  currentUserId={user?.uid}
                  busy={accessBusyUid === accessUser.uid}
                  onAccessChange={handleAccessChange}
                />
              ))}
            </UserAccessList>
          ) : (
            <AccessEmpty>
              {accessSearch
                ? 'No Firebase users match that search.'
                : 'No Firebase users were returned.'}
            </AccessEmpty>
          )}

          <AccessFootnote>
            <strong>How access works</strong>
            “No access” keeps the Authentication account but blocks Studio.
            Firestore applies role changes immediately. The configured owner
            and your current session are protected here.
          </AccessFootnote>
        </AccessManagerCard>
      )}
    </LibrarySection>
  );
}

function StudioDashboard() {
  const { user, claims, isAdmin, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('library');
  const [firebasePhotos, setFirebasePhotos] = useState([]);
  const [galleryError, setGalleryError] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(
    () =>
      subscribeToManagedPhotos(
        (photos) => {
          setFirebasePhotos(photos);
          setGalleryError(false);
        },
        () => setGalleryError(true),
      ),
    [],
  );

  const photos = useMemo(
    () => mergeManagedPhotos(firebasePhotos),
    [firebasePhotos],
  );

  const handleLogout = async () => {
    setLogoutError('');
    try {
      await logout();
    } catch (nextError) {
      setLogoutError(friendlyError(nextError));
    }
  };

  const displayName =
    user?.displayName ||
    claims?.displayName ||
    user?.email?.split('@')[0] ||
    'photographer';

  return (
    <DashboardShell>
      <DashboardNav>
        <Brand />
        <DashboardNavRight>
          <OnlineStatus>
            <i />
            Connected
          </OnlineStatus>
          <RoleBadge>{isAdmin ? 'Admin' : 'Studio'}</RoleBadge>
          <UserEmail>{user?.email}</UserEmail>
          <LogoutButton type="button" onClick={handleLogout}>
            Sign out
          </LogoutButton>
        </DashboardNavRight>
      </DashboardNav>

      {logoutError && (
        <GlobalNotice $error role="alert">
          {logoutError}
        </GlobalNotice>
      )}

      <DashboardHeading>
        <div>
          <Eyebrow>Private workspace</Eyebrow>
          <h1>
            Welcome back, <em>{displayName}.</em>
          </h1>
          <p>Curate every image and manage who can access the studio.</p>
        </div>
        <DashboardNumber aria-hidden="true">S</DashboardNumber>
      </DashboardHeading>

      <SectionTabs role="tablist" aria-label="Studio sections">
        {studioSections.map((section) => (
          <SectionTab
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeSection === section.id}
            $active={activeSection === section.id}
            onClick={() => setActiveSection(section.id)}
          >
            <small>{section.number}</small>
            <span>{section.label}</span>
          </SectionTab>
        ))}
      </SectionTabs>

      <DashboardContent role="tabpanel">
        {activeSection === 'library' && (
          <LibraryPanel photos={photos} galleryError={galleryError} />
        )}
        {activeSection === 'upload' && <UploadPanel />}
        {activeSection === 'site-images' && <SiteImagesPanel />}
        {activeSection === 'account' && <AccountPanel />}
      </DashboardContent>
    </DashboardShell>
  );
}

export function StudioPage() {
  const { user, loading, configured, isStudio } = useAuth();

  if (loading) {
    return <LoadingView />;
  }

  if (!configured) {
    return <SetupView />;
  }

  if (!user) {
    return <LoginView />;
  }

  return isStudio ? <StudioDashboard /> : <AccessDeniedView />;
}

export default StudioPage;

const pageFade = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: .25; transform: scale(.75); }
  50% { opacity: 1; transform: scale(1); }
`;

const BrandLink = styled.a`
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: ${({ $dark }) => ($dark ? '#11110f' : '#f5f1e8')};
  font: 800 14px/1 Arial, Helvetica, sans-serif;
  letter-spacing: 0.16em;
  text-decoration: none;

  small {
    display: block;
    margin-top: 5px;
    color: ${({ $dark }) =>
      $dark ? 'rgba(17,17,15,.52)' : 'rgba(245,241,232,.55)'};
    font-size: 7px;
    font-weight: 500;
    letter-spacing: 0.21em;
  }

  @media (max-width: 480px) {
    font-size: 11px;

    small {
      font-size: 6px;
    }
  }
`;

const BrandMark = styled.b`
  display: grid;
  width: 38px;
  height: 38px;
  border: 1px solid
    ${({ $dark }) =>
      $dark ? 'rgba(17,17,15,.25)' : 'rgba(245,241,232,.35)'};
  border-radius: 50%;
  font: italic 400 20px/1 Georgia, 'Times New Roman', serif;
  letter-spacing: 0;
  place-items: center;
`;

const LoadingShell = styled.main`
  display: grid;
  min-height: 100vh;
  padding: 28px clamp(24px, 4vw, 64px);
  background: #ebe8df;
  place-items: start;
`;

const Loader = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;

  i {
    width: 6px;
    height: 6px;
    animation: ${pulse} 1s ease-in-out infinite;
    border-radius: 50%;
    background: #cf4f2e;
  }

  i:nth-child(2) {
    animation-delay: 0.13s;
  }

  i:nth-child(3) {
    animation-delay: 0.26s;
  }
`;

const SetupShell = styled.main`
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: 28px clamp(24px, 5vw, 76px) 70px;
  background: #ebe8df;
  color: #11110f;
  font-family: Arial, Helvetica, sans-serif;
`;

const DeniedShell = styled(SetupShell)`
  background: #e9e6dc;
`;

const DeniedContent = styled.section`
  position: relative;
  z-index: 1;
  width: min(100%, 820px);
  margin-top: clamp(80px, 13vh, 150px);
  animation: ${pageFade} 0.65s ease both;
`;

const DeniedTitle = styled.h1`
  max-width: 800px;
  margin: 23px 0 25px;
  font: 400 clamp(48px, 7vw, 92px) / 0.91 Georgia, 'Times New Roman', serif;
  letter-spacing: -0.055em;
`;

const DeniedAccount = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
  margin-top: 34px;
  padding: 17px 18px;
  border: 1px solid rgba(17, 17, 15, 0.15);
  background: rgba(255, 255, 255, 0.25);

  span {
    color: rgba(17, 17, 15, 0.45);
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  strong {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
  }

  @media (max-width: 520px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 7px;
  }
`;

const DeniedGuidance = styled.ul`
  display: grid;
  margin: 18px 0 24px;
  padding: 0;
  border-top: 1px solid rgba(17, 17, 15, 0.14);
  list-style: none;

  li {
    display: grid;
    padding: 15px 0;
    border-bottom: 1px solid rgba(17, 17, 15, 0.14);
    color: rgba(17, 17, 15, 0.62);
    font-size: 12px;
    line-height: 1.6;
    grid-template-columns: 120px minmax(0, 1fr);
    gap: 18px;
  }

  span {
    color: #c54a2c;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  code {
    color: #11110f;
    font-size: 0.9em;
  }

  @media (max-width: 520px) {
    li {
      grid-template-columns: 1fr;
      gap: 5px;
    }
  }
`;

const DeniedActions = styled.div`
  display: grid;
  margin-top: 18px;
  grid-template-columns: minmax(0, 1fr) 150px;
  gap: 10px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const DeniedSignOut = styled.button`
  min-height: 58px;
  padding: 0 18px;
  border: 1px solid rgba(17, 17, 15, 0.25);
  background: transparent;
  color: #11110f;
  cursor: pointer;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;

  &:hover:not(:disabled) {
    border-color: #c54a2c;
    color: #c54a2c;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.55;
  }
`;

const SetupTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SetupContent = styled.section`
  position: relative;
  z-index: 1;
  max-width: 850px;
  margin-top: clamp(110px, 18vh, 200px);
  animation: ${pageFade} 0.65s ease both;
`;

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #c54a2c;
  font: 700 10px/1 Arial, Helvetica, sans-serif;
  letter-spacing: 0.2em;
  text-transform: uppercase;

  &::before {
    width: 26px;
    height: 1px;
    background: currentColor;
    content: '';
  }
`;

const SetupTitle = styled.h1`
  margin: 24px 0;
  font: 400 clamp(48px, 8vw, 112px) / 0.9 Georgia, 'Times New Roman', serif;
  letter-spacing: -0.055em;
`;

const SetupCopy = styled.p`
  max-width: 640px;
  margin: 0;
  color: rgba(17, 17, 15, 0.65);
  font-size: clamp(16px, 1.7vw, 20px);
  line-height: 1.65;

  code {
    padding: 3px 6px;
    border: 1px solid rgba(17, 17, 15, 0.14);
    background: rgba(255, 255, 255, 0.3);
    color: #11110f;
    font-size: 0.82em;
  }
`;

const SetupSteps = styled.ol`
  display: grid;
  max-width: 760px;
  margin: 54px 0 0;
  padding: 0;
  border-top: 1px solid rgba(17, 17, 15, 0.18);
  list-style: none;

  li {
    display: flex;
    gap: 24px;
    padding: 18px 0;
    border-bottom: 1px solid rgba(17, 17, 15, 0.18);
    color: rgba(17, 17, 15, 0.72);
    font-size: 14px;
  }

  span {
    color: #c54a2c;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.15em;
  }
`;

const SetupIndex = styled.span`
  position: absolute;
  right: -0.05em;
  bottom: -0.2em;
  color: rgba(17, 17, 15, 0.035);
  font: 400 clamp(240px, 42vw, 650px) / 0.75 Georgia, serif;
  letter-spacing: -0.08em;
`;

const BackLink = styled.a`
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 13px;
  border-bottom: 1px solid
    ${({ $light }) =>
      $light ? 'rgba(255,255,255,.35)' : 'rgba(17,17,15,.25)'};
  color: ${({ $light }) => ($light ? '#f5f1e8' : '#11110f')};
  font: 700 9px/2.4 Arial, Helvetica, sans-serif;
  letter-spacing: 0.18em;
  text-decoration: none;
  text-transform: uppercase;

  svg {
    width: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.4;
    transition: transform 0.2s ease;
  }

  &:hover svg {
    transform: translateX(3px);
  }

  @media (max-width: 520px) {
    font-size: 0;

    svg {
      width: 22px;
    }
  }
`;

const LoginShell = styled.main`
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(420px, 1.15fr) minmax(390px, 0.85fr);
  background: #e9e6dc;
  color: #11110f;
  font-family: Arial, Helvetica, sans-serif;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const LoginVisual = styled.section`
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: 28px clamp(24px, 5vw, 72px) 42px;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.35)),
    ${({ $image }) => ($image ? `url("${$image}") center/cover` : '#24251f')};
  color: #f5f1e8;

  @media (max-width: 820px) {
    min-height: 54vh;
  }
`;

const LoginOverlay = styled.div`
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(12, 12, 10, 0.12), transparent),
    linear-gradient(0deg, rgba(12, 12, 10, 0.44), transparent 70%);
`;

const LoginTop = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const LoginQuote = styled.div`
  position: absolute;
  z-index: 2;
  bottom: 10%;
  left: clamp(24px, 5vw, 72px);
  animation: ${pageFade} 0.7s 0.1s ease both;

  > span {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  blockquote {
    margin: 18px 0 22px;
    font: italic 400 clamp(48px, 6.2vw, 94px) / 0.9 Georgia,
      'Times New Roman', serif;
    letter-spacing: -0.05em;
  }

  p {
    max-width: 340px;
    margin: 0;
    color: rgba(245, 241, 232, 0.72);
    font-size: 13px;
    line-height: 1.6;
  }
`;

const FrameLabel = styled.span`
  position: absolute;
  z-index: 2;
  right: 24px;
  bottom: 42px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.22em;
  writing-mode: vertical-rl;
`;

const LoginPanel = styled.section`
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  justify-content: center;
  padding: clamp(52px, 9vw, 120px) clamp(28px, 7vw, 112px) 28px;

  @media (max-width: 820px) {
    min-height: auto;
  }
`;

const LoginCard = styled.div`
  width: min(100%, 480px);
  margin: auto;
  animation: ${pageFade} 0.65s 0.18s ease both;
`;

const LoginTitle = styled.h1`
  margin: 22px 0 16px;
  font: 400 clamp(45px, 5vw, 72px) / 0.93 Georgia, 'Times New Roman', serif;
  letter-spacing: -0.055em;
`;

const LoginIntro = styled.p`
  max-width: 370px;
  margin: 0;
  color: rgba(17, 17, 15, 0.55);
  font-size: 14px;
  line-height: 1.65;
`;

const LoginForm = styled.form`
  display: grid;
  gap: 22px;
  margin-top: 46px;
`;

const Field = styled.div`
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};

  label {
    display: block;
    margin-bottom: 10px;
    color: rgba(17, 17, 15, 0.7);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;

    small {
      color: rgba(17, 17, 15, 0.38);
      font-size: 8px;
      font-weight: 500;
    }
  }

  input,
  select {
    box-sizing: border-box;
    width: 100%;
    height: 52px;
    padding: 0 15px;
    border: 1px solid rgba(17, 17, 15, 0.18);
    border-radius: 0;
    outline: none;
    background: rgba(255, 255, 255, 0.28);
    color: #11110f;
    font: 400 14px/1 Arial, Helvetica, sans-serif;
    transition:
      border-color 0.2s ease,
      background 0.2s ease;

    &:focus {
      border-color: #c54a2c;
      background: rgba(255, 255, 255, 0.55);
    }

    &::placeholder {
      color: rgba(17, 17, 15, 0.3);
    }

    &:disabled {
      cursor: wait;
      opacity: 0.6;
    }
  }
`;

const FieldHeading = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 15px;

  label {
    margin-bottom: 10px;
  }
`;

const TextButton = styled.button`
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(17, 17, 15, 0.5);
  cursor: pointer;
  font: 600 9px/1.2 Arial, Helvetica, sans-serif;
  text-align: right;
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover {
    color: #c54a2c;
  }
`;

const FormMessage = styled.p`
  margin: 0;
  padding: 12px 14px;
  border-left: 2px solid ${({ $error }) => ($error ? '#b93927' : '#427052')};
  background: ${({ $error }) =>
    $error ? 'rgba(185,57,39,.07)' : 'rgba(66,112,82,.08)'};
  color: ${({ $error }) => ($error ? '#8f2d20' : '#315a40')};
  font-size: 12px;
  line-height: 1.45;
`;

const PrimaryButton = styled.button`
  display: flex;
  width: 100%;
  height: 58px;
  align-items: center;
  justify-content: space-between;
  padding: 0 21px;
  border: 0;
  background: #11110f;
  color: #f5f1e8;
  cursor: pointer;
  font: 700 10px/1 Arial, Helvetica, sans-serif;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  transition:
    background 0.2s ease,
    transform 0.2s ease;

  svg {
    width: 19px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.5;
  }

  &:hover:not(:disabled) {
    background: #c54a2c;
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }
`;

const LoginFooter = styled.footer`
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-top: 55px;
  padding-top: 22px;
  border-top: 1px solid rgba(17, 17, 15, 0.12);
  color: rgba(17, 17, 15, 0.35);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
`;

const DashboardShell = styled.main`
  min-height: 100vh;
  padding-bottom: 90px;
  background: #161713;
  color: #eeece4;
  font-family: Arial, Helvetica, sans-serif;
`;

const DashboardNav = styled.nav`
  display: flex;
  min-height: 88px;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(18px, 4.5vw, 70px);
  border-bottom: 1px solid rgba(238, 236, 228, 0.12);
`;

const DashboardNavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 650px) {
    gap: 8px;
  }
`;

const OnlineStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: rgba(238, 236, 228, 0.52);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;

  i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #83a36b;
    box-shadow: 0 0 0 4px rgba(131, 163, 107, 0.1);
  }

  @media (max-width: 720px) {
    display: none;
  }
`;

const RoleBadge = styled.span`
  padding: 6px 8px;
  border: 1px solid rgba(207, 86, 53, 0.48);
  color: #e87554;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
`;

const UserEmail = styled.span`
  color: rgba(238, 236, 228, 0.38);
  font-size: 9px;

  @media (max-width: 820px) {
    display: none;
  }
`;

const LogoutButton = styled.button`
  padding: 9px 12px;
  border: 1px solid rgba(238, 236, 228, 0.2);
  background: transparent;
  color: #eeece4;
  cursor: pointer;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;

  &:hover {
    border-color: #cf5635;
    color: #cf5635;
  }
`;

const GlobalNotice = styled.p`
  width: min(calc(100% - 44px), 1400px);
  margin: 20px auto 0;
  padding: 12px 15px;
  border-left: 2px solid #b93927;
  background: rgba(185, 57, 39, 0.14);
  color: #f1b3a8;
  font-size: 12px;
`;

const DashboardHeading = styled.header`
  position: relative;
  display: flex;
  max-width: 1440px;
  align-items: flex-end;
  justify-content: space-between;
  margin: 0 auto;
  padding: clamp(62px, 9vw, 128px) clamp(22px, 4.5vw, 70px)
    clamp(42px, 6vw, 72px);
  overflow: hidden;
  animation: ${pageFade} 0.6s ease both;

  h1 {
    position: relative;
    z-index: 1;
    max-width: 1050px;
    margin: 23px 0 15px;
    font: 400 clamp(45px, 6.5vw, 94px) / 0.9 Georgia, 'Times New Roman',
      serif;
    letter-spacing: -0.06em;
  }

  em {
    color: #cf5635;
    font-weight: 400;
  }

  p {
    margin: 0;
    color: rgba(238, 236, 228, 0.5);
    font-size: 13px;
  }
`;

const DashboardNumber = styled.span`
  position: absolute;
  right: 4%;
  bottom: -0.2em;
  color: rgba(238, 236, 228, 0.025);
  font: 400 clamp(230px, 32vw, 460px) / 0.75 Georgia, serif;
  letter-spacing: -0.08em;
`;

const SectionTabs = styled.div`
  display: grid;
  width: min(calc(100% - 44px), 1300px);
  margin: 0 auto;
  border: 1px solid rgba(238, 236, 228, 0.14);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  animation: ${pageFade} 0.6s 0.08s ease both;

  @media (max-width: 720px) {
    overflow-x: auto;
    grid-template-columns: repeat(4, minmax(150px, 1fr));
  }
`;

const SectionTab = styled.button`
  display: flex;
  min-height: 68px;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  border: 0;
  border-right: 1px solid rgba(238, 236, 228, 0.14);
  background: ${({ $active }) => ($active ? '#cf5635' : 'transparent')};
  color: ${({ $active }) => ($active ? '#11110f' : '#eeece4')};
  cursor: pointer;
  text-align: left;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:last-child {
    border-right: 0;
  }

  small {
    color: ${({ $active }) =>
      $active ? 'rgba(17,17,15,.5)' : 'rgba(238,236,228,.35)'};
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.14em;
  }

  span {
    font: 400 18px/1 Georgia, 'Times New Roman', serif;
  }

  &:hover:not([aria-selected='true']) {
    background: rgba(238, 236, 228, 0.06);
  }
`;

const DashboardContent = styled.div`
  width: min(calc(100% - 44px), 1300px);
  margin: 20px auto 0;
  animation: ${pageFade} 0.45s ease both;
`;

const LibrarySection = styled.section`
  padding: clamp(24px, 4vw, 48px);
  background: #e9e6dc;
  color: #11110f;
`;

const LibraryTop = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 40px;
  padding-bottom: 38px;
  border-bottom: 1px solid rgba(17, 17, 15, 0.14);

  @media (max-width: 720px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 24px;
  }
`;

const SectionTitle = styled.h2`
  margin: 18px 0 12px;
  font: 400 clamp(38px, 5vw, 68px) / 0.94 Georgia, 'Times New Roman', serif;
  letter-spacing: -0.05em;
`;

const SectionCopy = styled.p`
  max-width: 650px;
  margin: 0;
  color: rgba(17, 17, 15, 0.58);
  font-size: 13px;
  line-height: 1.65;
`;

const LibraryStats = styled.div`
  min-width: 150px;
  text-align: right;

  strong,
  span,
  small {
    display: block;
  }

  strong {
    font: 400 70px/0.8 Georgia, 'Times New Roman', serif;
    letter-spacing: -0.07em;
  }

  span {
    margin-top: 12px;
    color: rgba(17, 17, 15, 0.58);
    font: italic 400 16px/1 Georgia, 'Times New Roman', serif;
  }

  small {
    margin-top: 12px;
    color: #48724f;
    font-size: 7px;
    font-weight: 800;
    letter-spacing: 0.15em;
  }

  @media (max-width: 720px) {
    text-align: left;
  }
`;

const FilterBlock = styled.div`
  padding: 30px 0 25px;
`;

const FilterHeading = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 14px;

  > span {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  small {
    color: rgba(17, 17, 15, 0.4);
    font-size: 9px;
  }

  @media (max-width: 600px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
`;

const FilterChips = styled.div`
  display: flex;
  overflow-x: auto;
  padding-bottom: 5px;
  gap: 7px;
  scrollbar-width: thin;
`;

const FilterChip = styled.button`
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  flex: 0 0 auto;
  gap: 8px;
  padding: 0 13px;
  border: 1px solid
    ${({ $active }) => ($active ? '#11110f' : 'rgba(17,17,15,.2)')};
  border-radius: 30px;
  background: ${({ $active }) => ($active ? '#11110f' : 'transparent')};
  color: ${({ $active }) => ($active ? '#f5f1e8' : '#11110f')};
  cursor: pointer;
  font-size: 10px;
  white-space: nowrap;

  span {
    display: grid;
    min-width: 19px;
    height: 19px;
    padding: 0 4px;
    border-radius: 20px;
    background: ${({ $active }) =>
      $active ? 'rgba(255,255,255,.13)' : 'rgba(17,17,15,.08)'};
    font-size: 8px;
    place-items: center;
  }
`;

const LibraryToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
  padding: 16px 0;
  border-top: 1px solid rgba(17, 17, 15, 0.14);
  border-bottom: 1px solid rgba(17, 17, 15, 0.14);

  p {
    margin: 0;
    color: rgba(17, 17, 15, 0.55);
    font-size: 11px;
  }

  strong {
    color: #11110f;
  }

  label {
    display: flex;
    align-items: center;
    gap: 10px;

    span {
      color: rgba(17, 17, 15, 0.45);
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
  }

  select {
    height: 36px;
    padding: 0 34px 0 11px;
    border: 1px solid rgba(17, 17, 15, 0.2);
    border-radius: 0;
    background: rgba(255, 255, 255, 0.3);
    color: #11110f;
    font-size: 10px;
  }

  @media (max-width: 560px) {
    align-items: stretch;
    flex-direction: column;

    label {
      justify-content: space-between;
    }
  }
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1060px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const PhotoCardShell = styled.article`
  min-width: 0;
  border: 1px solid rgba(17, 17, 15, 0.14);
  background: rgba(255, 255, 255, 0.25);
  content-visibility: auto;
  contain-intrinsic-size: 520px;
`;

const PhotoVisual = styled.div`
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  background: #c9c6bc;

  > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PhotoBadges = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  left: 12px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`;

const PhotoBadge = styled.span`
  padding: 6px 8px;
  background: ${({ $warm }) =>
    $warm ? '#cf5635' : 'rgba(17,17,15,.78)'};
  color: ${({ $warm }) => ($warm ? '#11110f' : '#f5f1e8')};
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const PhotoBusy = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  background: rgba(17, 17, 15, 0.58);
  color: white;
  font: 400 24px/1 Georgia, 'Times New Roman', serif;
  place-items: center;
`;

const PhotoCardBody = styled.div`
  padding: 18px;
`;

const PhotoMeta = styled.div`
  min-height: 91px;

  > span {
    color: #c54a2c;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  h3 {
    margin: 8px 0 10px;
    font: 400 24px/1 Georgia, 'Times New Roman', serif;
  }

  small {
    color: rgba(17, 17, 15, 0.45);
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
`;

const PhotoActionRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  padding-top: 14px;
  border-top: 1px solid rgba(17, 17, 15, 0.12);
`;

const SmallButton = styled.button`
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 11px;
  border: 1px solid
    ${({ $filled }) => ($filled ? '#11110f' : 'rgba(17,17,15,.22)')};
  background: ${({ $filled }) => ($filled ? '#11110f' : 'transparent')};
  color: ${({ $filled }) => ($filled ? '#f5f1e8' : '#11110f')};
  cursor: pointer;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;

  svg {
    width: 14px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.5;
  }

  &:hover:not(:disabled) {
    border-color: #c54a2c;
    background: #c54a2c;
    color: #11110f;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.5;
  }
`;

const DangerButton = styled(SmallButton)`
  margin-left: auto;
  border-color: ${({ $confirm }) =>
    $confirm ? '#9b3225' : 'rgba(155,50,37,.3)'};
  background: ${({ $confirm }) => ($confirm ? '#9b3225' : 'transparent')};
  color: ${({ $confirm }) => ($confirm ? '#fff' : '#8f2d20')};
`;

const QuietButton = styled.button`
  min-height: 34px;
  padding: 0 7px;
  border: 0;
  background: transparent;
  color: rgba(17, 17, 15, 0.52);
  cursor: pointer;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-transform: uppercase;
`;

const PhotoEditForm = styled.form`
  display: grid;
  gap: 14px;
`;

const CompactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 10px;

  @media (max-width: 400px) {
    grid-template-columns: 1fr;
  }
`;

const CompactField = styled.div`
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};

  label {
    display: block;
    margin-bottom: 6px;
    color: rgba(17, 17, 15, 0.58);
    font-size: 7px;
    font-weight: 800;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  input,
  select,
  textarea {
    box-sizing: border-box;
    width: 100%;
    min-height: 40px;
    padding: 9px 10px;
    border: 1px solid rgba(17, 17, 15, 0.18);
    border-radius: 0;
    outline: none;
    background: rgba(255, 255, 255, 0.45);
    color: #11110f;
    font: 400 11px/1.35 Arial, Helvetica, sans-serif;
    resize: vertical;

    &:focus {
      border-color: #c54a2c;
    }
  }

  @media (max-width: 400px) {
    grid-column: auto;
  }
`;

const MiniToggles = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  padding: 12px 0;
  border-top: 1px solid rgba(17, 17, 15, 0.1);
  border-bottom: 1px solid rgba(17, 17, 15, 0.1);
`;

const ReplacementRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  > span {
    min-width: 0;
    overflow: hidden;
    color: rgba(17, 17, 15, 0.48);
    font-size: 8px;
    line-height: 1.4;
    text-overflow: ellipsis;
  }
`;

const InlineMessage = styled.p`
  margin: 0;
  padding: 9px 10px;
  border-left: 2px solid ${({ $error }) => ($error ? '#b93927' : '#427052')};
  background: ${({ $error }) =>
    $error ? 'rgba(185,57,39,.07)' : 'rgba(66,112,82,.08)'};
  color: ${({ $error }) => ($error ? '#8f2d20' : '#315a40')};
  font-size: 9px;
  line-height: 1.45;
`;

const EditActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const EmptyLibrary = styled.div`
  display: grid;
  min-height: 240px;
  place-items: center;
  align-content: center;
  gap: 14px;
  color: rgba(17, 17, 15, 0.52);
  font: italic 400 20px/1.2 Georgia, 'Times New Roman', serif;

  button {
    border: 0;
    background: transparent;
    color: #c54a2c;
    cursor: pointer;
    font: 800 8px/1 Arial, Helvetica, sans-serif;
    letter-spacing: 0.14em;
    text-decoration: underline;
    text-transform: uppercase;
  }
`;

const SectionLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.65fr);
  gap: 20px;

  @media (max-width: 940px) {
    grid-template-columns: 1fr;
  }
`;

const UploadCard = styled.section`
  background: #e9e6dc;
  color: #11110f;
`;

const CardHeader = styled.header`
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(17, 17, 15, 0.13);

  > span {
    font: 400 20px/1 Georgia, 'Times New Roman', serif;
  }

  small {
    color: rgba(17, 17, 15, 0.45);
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.16em;
  }
`;

const UploadForm = styled.form`
  padding: clamp(18px, 3.2vw, 44px);
`;

const Dropzone = styled.div`
  position: relative;
  display: grid;
  min-height: 330px;
  overflow: hidden;
  border: 1px
    ${({ $hasFile }) => ($hasFile ? 'solid' : 'dashed')}
    ${({ $dragging }) => ($dragging ? '#c54a2c' : 'rgba(17,17,15,.25)')};
  background: ${({ $dragging }) =>
    $dragging ? 'rgba(197,74,44,.08)' : 'rgba(255,255,255,.19)'};
  place-items: center;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;

  @media (max-width: 580px) {
    min-height: 270px;
  }
`;

const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
`;

const EmptyDrop = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 38px 18px;
  text-align: center;

  strong {
    margin: 19px 0 7px;
    font: 400 29px/1 Georgia, 'Times New Roman', serif;
  }

  > span {
    color: rgba(17, 17, 15, 0.48);
    font-size: 12px;
  }

  small {
    color: rgba(17, 17, 15, 0.35);
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.1em;
  }
`;

const UploadBadge = styled.span`
  display: grid;
  width: 60px;
  height: 60px;
  border: 1px solid rgba(17, 17, 15, 0.2);
  border-radius: 50%;
  place-items: center;

  svg {
    width: 21px;
    fill: none;
    stroke: #c54a2c;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.5;
  }
`;

const ChooseFile = styled.button`
  margin: 21px 0 18px;
  padding: 10px 15px;
  border: 1px solid rgba(17, 17, 15, 0.26);
  background: transparent;
  color: #11110f;
  cursor: pointer;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;

  &:hover {
    border-color: #c54a2c;
    color: #c54a2c;
  }
`;

const PreviewImage = styled.img`
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PreviewShade = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(10, 10, 8, 0.7), transparent 55%);
`;

const FileDetails = styled.div`
  position: absolute;
  z-index: 2;
  bottom: 20px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 11px;
  color: #f5f1e8;

  > span {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
    font-size: 9px;
  }

  strong {
    max-width: 340px;
    overflow: hidden;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const FileBadge = styled.i`
  display: grid;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #c54a2c;
  place-items: center;

  svg {
    width: 16px;
    fill: none;
    stroke: white;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1.8;
  }
`;

const ChangeFile = styled.button`
  position: absolute;
  z-index: 2;
  right: 20px;
  bottom: 20px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(10, 10, 8, 0.22);
  color: white;
  cursor: pointer;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;

  @media (max-width: 480px) {
    top: 16px;
    right: 16px;
    bottom: auto;
  }
`;

const FormGrid = styled.div`
  display: grid;
  margin-top: 31px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 18px;

  @media (max-width: 580px) {
    grid-template-columns: 1fr;

    ${Field} {
      grid-column: auto;
    }
  }
`;

const SelectWrap = styled.div`
  position: relative;

  select {
    padding-right: 42px;
    appearance: none;
  }

  span {
    position: absolute;
    top: 50%;
    right: 16px;
    pointer-events: none;
    transform: translateY(-56%);
  }
`;

const ToggleGroup = styled.div`
  display: grid;
  margin-top: 29px;
  padding: 22px 0;
  border-top: 1px solid rgba(17, 17, 15, 0.12);
  border-bottom: 1px solid rgba(17, 17, 15, 0.12);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;

  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
`;

const ToggleTrack = styled.i`
  position: relative;
  width: 38px;
  height: 20px;
  flex: 0 0 auto;
  border-radius: 20px;
  background: rgba(17, 17, 15, 0.18);
  transition: background 0.2s ease;

  i {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.2s ease;
  }
`;

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  input:checked + ${ToggleTrack} {
    background: #c54a2c;
  }

  input:checked + ${ToggleTrack} i {
    transform: translateX(18px);
  }

  input:focus-visible + ${ToggleTrack} {
    outline: 2px solid #11110f;
    outline-offset: 3px;
  }

  > span {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: rgba(17, 17, 15, 0.44);
    font-size: 9px;
  }

  strong {
    color: #11110f;
    font-size: 11px;
    font-weight: 700;
  }
`;

const ProgressWrap = styled.div`
  margin-top: 24px;
`;

const ProgressMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: rgba(17, 17, 15, 0.55);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;

  strong {
    color: #c54a2c;
  }
`;

const ProgressTrack = styled.div`
  height: 3px;
  overflow: hidden;
  background: rgba(17, 17, 15, 0.12);

  i {
    display: block;
    height: 100%;
    background: #c54a2c;
    transition: width 0.2s ease;
  }
`;

const PublishButton = styled(PrimaryButton)`
  margin-top: 25px;
  background: #c54a2c;

  &:hover:not(:disabled) {
    background: #11110f;
  }
`;

const SideColumn = styled.aside`
  display: grid;
  align-content: start;
  gap: 20px;
`;

const InfoCard = styled.section`
  background: ${({ $accent }) => ($accent ? '#cf5635' : '#e9e6dc')};
  color: #11110f;
`;

const InfoBody = styled.div`
  padding: 28px 24px;

  p {
    margin: 18px 0 0;
    font: italic 400 18px/1.45 Georgia, 'Times New Roman', serif;
  }
`;

const BigIndex = styled.strong`
  display: block;
  font: 400 88px/0.8 Georgia, 'Times New Roman', serif;
  letter-spacing: -0.08em;
`;

const TipCard = styled.section`
  padding: 27px 25px;
  border: 1px solid rgba(238, 236, 228, 0.15);

  span {
    color: #cf5635;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.16em;
  }

  p {
    margin: 17px 0 0;
    color: rgba(238, 236, 228, 0.58);
    font: italic 400 18px/1.45 Georgia, 'Times New Roman', serif;
  }
`;

const SiteSlotGrid = styled.div`
  display: grid;
  margin-top: 30px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const SiteSlotCard = styled.article`
  min-width: 0;
  border: 1px solid rgba(17, 17, 15, 0.14);
  background: rgba(255, 255, 255, 0.27);
`;

const SiteSlotVisual = styled.div`
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  background: #c9c6bc;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const SiteSlotLabel = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 15px;
  padding: 40px 16px 14px;
  background: linear-gradient(transparent, rgba(17, 17, 15, 0.78));
  color: white;

  span {
    font: 400 21px/1 Georgia, 'Times New Roman', serif;
  }

  small {
    font-size: 7px;
    font-weight: 800;
    letter-spacing: 0.14em;
  }
`;

const SiteSlotForm = styled.form`
  display: grid;
  gap: 14px;
  padding: 18px;

  > p {
    min-height: 34px;
    margin: 0;
    color: rgba(17, 17, 15, 0.53);
    font-size: 10px;
    line-height: 1.55;
  }
`;

const SiteSlotActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ChosenFile = styled.span`
  overflow: hidden;
  color: rgba(17, 17, 15, 0.48);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AccountIdentity = styled.div`
  min-width: 220px;
  padding: 16px 18px;
  border: 1px solid rgba(17, 17, 15, 0.14);
  text-align: right;

  span,
  strong,
  small {
    display: block;
  }

  span {
    font: 400 18px/1 Georgia, 'Times New Roman', serif;
  }

  strong {
    margin-top: 8px;
    color: rgba(17, 17, 15, 0.5);
    font-size: 9px;
    font-weight: 400;
  }

  small {
    margin-top: 12px;
    color: #c54a2c;
    font-size: 7px;
    font-weight: 800;
    letter-spacing: 0.15em;
  }

  @media (max-width: 720px) {
    text-align: left;
  }
`;

const AccountGrid = styled.div`
  display: grid;
  margin-top: 30px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

const AccountCard = styled.section`
  border: 1px solid rgba(17, 17, 15, 0.14);
  background: rgba(255, 255, 255, 0.25);
`;

const AccountForm = styled.form`
  display: grid;
  gap: 18px;
  padding: clamp(20px, 3vw, 34px);
`;

const AccessManagerCard = styled.section`
  margin-top: 16px;
  border: 1px solid rgba(17, 17, 15, 0.14);
  background: rgba(255, 255, 255, 0.25);
`;

const AccessManagerTop = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  padding: clamp(24px, 4vw, 42px);
  border-bottom: 1px solid rgba(17, 17, 15, 0.12);

  h3 {
    margin: 11px 0 12px;
    font: 400 clamp(28px, 4vw, 46px) / 0.98 Georgia, 'Times New Roman',
      serif;
    letter-spacing: -0.045em;
  }

  p {
    max-width: 650px;
    margin: 0;
    color: rgba(17, 17, 15, 0.53);
    font-size: 12px;
    line-height: 1.65;
  }

  @media (max-width: 850px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const AccessCounts = styled.div`
  display: flex;
  flex: 0 0 auto;
  gap: 5px;

  span {
    display: grid;
    min-width: 74px;
    gap: 8px;
    padding: 13px;
    border: 1px solid rgba(17, 17, 15, 0.13);
    color: rgba(17, 17, 15, 0.45);
    font-size: 7px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  strong {
    color: #11110f;
    font: 400 24px/1 Georgia, 'Times New Roman', serif;
  }

  @media (max-width: 430px) {
    width: 100%;

    span {
      min-width: 0;
      flex: 1;
    }
  }
`;

const AccessToolbar = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 18px clamp(20px, 4vw, 42px);
  border-bottom: 1px solid rgba(17, 17, 15, 0.1);

  @media (max-width: 600px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

const AccessSearch = styled.div`
  width: min(100%, 410px);

  label {
    display: block;
    margin-bottom: 8px;
    color: rgba(17, 17, 15, 0.52);
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  input {
    box-sizing: border-box;
    width: 100%;
    height: 44px;
    padding: 0 14px;
    border: 1px solid rgba(17, 17, 15, 0.16);
    outline: none;
    background: rgba(255, 255, 255, 0.38);
    color: #11110f;
    font-size: 12px;

    &:focus {
      border-color: #c54a2c;
      background: rgba(255, 255, 255, 0.68);
    }
  }

  @media (max-width: 600px) {
    width: 100%;
  }
`;

const AccessRefreshButton = styled.button`
  height: 44px;
  padding: 0 17px;
  border: 1px solid rgba(17, 17, 15, 0.2);
  background: transparent;
  color: #11110f;
  cursor: pointer;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;

  &:hover:not(:disabled) {
    border-color: #c54a2c;
    color: #c54a2c;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.45;
  }
`;

const AccessMessage = styled(FormMessage)`
  margin: 16px clamp(20px, 4vw, 42px) 0;
`;

const UserAccessList = styled.div`
  padding: 0 clamp(20px, 4vw, 42px);
`;

const UserAccessRow = styled.article`
  display: grid;
  grid-template-columns: 42px minmax(160px, 1fr) minmax(285px, auto) 130px;
  align-items: center;
  gap: 18px;
  min-height: 92px;
  padding: 13px 0;
  border-bottom: 1px solid rgba(17, 17, 15, 0.11);
  opacity: ${({ $disabled }) => ($disabled ? 0.58 : 1)};

  @media (max-width: 1000px) {
    grid-template-columns: 42px 1fr auto;

    > div:nth-child(3) {
      grid-column: 2 / -1;
    }
  }

  @media (max-width: 650px) {
    grid-template-columns: 38px 1fr;
    gap: 12px;
    padding: 18px 0;

    > div:nth-child(3),
    > div:nth-child(4) {
      grid-column: 1 / -1;
    }
  }
`;

const UserAvatar = styled.div`
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 50%;
  background: #11110f;
  color: #f5f1e8;
  font: 400 18px/1 Georgia, 'Times New Roman', serif;

  @media (max-width: 650px) {
    width: 38px;
    height: 38px;
  }
`;

const UserAccessIdentity = styled.div`
  min-width: 0;

  > span,
  > small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  > span {
    margin-top: 5px;
    color: rgba(17, 17, 15, 0.58);
    font-size: 10px;
  }

  > small {
    margin-top: 7px;
    color: rgba(17, 17, 15, 0.34);
    font-size: 8px;
  }
`;

const UserNameLine = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;

  strong {
    font: 400 16px/1.1 Georgia, 'Times New Roman', serif;
  }
`;

const UserTag = styled.span`
  padding: 3px 5px;
  background: ${({ $owner }) =>
    $owner ? 'rgba(197, 74, 44, 0.12)' : 'rgba(17, 17, 15, 0.07)'};
  color: ${({ $owner }) => ($owner ? '#a43a23' : 'rgba(17, 17, 15, 0.5)')};
  font-size: 6px;
  font-weight: 900;
  letter-spacing: 0.11em;
`;

const RolePicker = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(80px, 1fr));
  padding: 3px;
  border: 1px solid rgba(17, 17, 15, 0.14);
  background: rgba(17, 17, 15, 0.035);

  @media (max-width: 650px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const RoleButton = styled.button`
  min-height: 34px;
  padding: 6px 9px;
  border: 0;
  background: ${({ $active }) => ($active ? '#11110f' : 'transparent')};
  color: ${({ $active }) =>
    $active ? '#f5f1e8' : 'rgba(17, 17, 15, 0.54)'};
  cursor: pointer;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover:not(:disabled) {
    color: ${({ $active }) => ($active ? '#f5f1e8' : '#c54a2c')};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: ${({ $active }) => ($active ? 1 : 0.42)};
  }
`;

const AccessState = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(17, 17, 15, 0.42);
  font-size: 8px;
  line-height: 1.35;

  i {
    width: 6px;
    height: 6px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: ${({ $level }) =>
      $level === 'none'
        ? '#a9a398'
        : $level === 'admin'
          ? '#c54a2c'
          : '#427052'};
  }

  @media (max-width: 650px) {
    justify-content: flex-end;
  }
`;

const AccessLoading = styled.div`
  display: flex;
  min-height: 150px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(17, 17, 15, 0.45);
  font-size: 10px;

  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #c54a2c;
    animation: ${pulse} 1.2s ease-in-out infinite;
  }
`;

const AccessEmpty = styled.p`
  min-height: 110px;
  margin: 0;
  padding: 55px clamp(20px, 4vw, 42px);
  color: rgba(17, 17, 15, 0.45);
  font-size: 11px;
  text-align: center;
`;

const AccessFootnote = styled.p`
  margin: 0;
  padding: 17px clamp(20px, 4vw, 42px);
  border-top: 1px solid rgba(17, 17, 15, 0.1);
  background: rgba(17, 17, 15, 0.035);
  color: rgba(17, 17, 15, 0.48);
  font-size: 9px;
  line-height: 1.6;

  strong {
    margin-right: 7px;
    color: #11110f;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
`;

const PasswordTools = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 7px;

  button {
    padding: 0;
    border: 0;
    background: transparent;
    color: #c54a2c;
    cursor: pointer;
    font-size: 8px;
    font-weight: 700;
    text-decoration: underline;
  }

  span {
    color: rgba(17, 17, 15, 0.4);
    font-size: 8px;
    text-align: right;
  }
`;

const PermissionCard = styled.section`
  display: flex;
  min-height: 340px;
  justify-content: center;
  flex-direction: column;
  padding: clamp(28px, 5vw, 55px);
  border: 1px solid rgba(17, 17, 15, 0.14);
  background: #dcd8cd;

  > span {
    color: #c54a2c;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.16em;
  }

  h3 {
    max-width: 420px;
    margin: 18px 0;
    font: 400 clamp(28px, 4vw, 44px) / 1 Georgia, 'Times New Roman', serif;
    letter-spacing: -0.04em;
  }

  p {
    max-width: 460px;
    margin: 0;
    color: rgba(17, 17, 15, 0.55);
    font-size: 12px;
    line-height: 1.6;
  }
`;
