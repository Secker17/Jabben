import { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../context/AuthContext';
import {
  MAX_IMAGE_SIZE,
  PHOTO_CATEGORIES,
  subscribeToPublishedPhotos,
  uploadPhoto,
} from '../services/galleryService';

const currentYear = new Date().getFullYear();

const initialForm = () => ({
  title: '',
  alt: '',
  category: PHOTO_CATEGORIES[0],
  year: currentYear,
  featured: false,
  published: true,
});

const friendlyError = (error) => {
  const messages = {
    'auth/invalid-credential': 'Incorrect email address or password.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/too-many-requests':
      'Too many attempts. Please wait a moment before trying again.',
    'auth/network-request-failed':
      'Unable to connect to Firebase. Check your connection and try again.',
    'auth/missing-email': 'Enter your email address first.',
    'auth/missing-credentials': 'Enter both your email address and password.',
    'storage/unauthorized': 'You do not have permission to upload here.',
    'storage/quota-exceeded': 'The Firebase storage quota has been reached.',
    'firebase/not-configured': 'Firebase has not been configured yet.',
  };

  return (
    messages[error?.code] ||
    error?.message ||
    'Something went wrong. Please try again in a moment.'
  );
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
          The public portfolio works without configuration. To enable image
          uploads, copy <code>.env.example</code> to <code>.env.local</code>{' '}
          and add the values from Firebase Console.
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
            Create Firestore and Storage, then deploy the included rules.
          </li>
        </SetupSteps>
      </SetupContent>
      <SetupIndex aria-hidden="true">00</SetupIndex>
    </SetupShell>
  );
}

function LoginView() {
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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
      <LoginVisual>
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
        <FrameLabel>JULIAN BJØRGEN / ADMIN ACCESS</FrameLabel>
      </LoginVisual>

      <LoginPanel>
        <LoginCard>
          <Eyebrow>Photographer access only</Eyebrow>
          <LoginTitle>Sign in to the studio</LoginTitle>
          <LoginIntro>
            Use the email account created in Firebase Authentication.
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

            {error && <FormMessage $error role="alert">{error}</FormMessage>}
            {notice && <FormMessage role="status">{notice}</FormMessage>}

            <PrimaryButton type="submit" disabled={busy}>
              <span>{busy ? 'Signing in…' : 'Enter studio'}</span>
              <ArrowIcon />
            </PrimaryButton>
          </LoginForm>
        </LoginCard>

        <LoginFooter>
          <span>Protected by Firebase Authentication</span>
          <span>JULIAN BJØRGEN © {currentYear}</span>
        </LoginFooter>
      </LoginPanel>
    </LoginShell>
  );
}

function FileDropzone({ file, previewUrl, onFile, disabled }) {
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
        id="studio-file"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
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
          <small>JPG, PNG, WEBP, or AVIF · max 15 MB</small>
        </EmptyDrop>
      )}
    </Dropzone>
  );
}

function StudioDashboard() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [publishedPhotos, setPublishedPhotos] = useState([]);
  const [galleryError, setGalleryError] = useState(false);

  useEffect(
    () =>
      subscribeToPublishedPhotos(
        setPublishedPhotos,
        () => setGalleryError(true)
      ),
    []
  );

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

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

    if (!nextFile.type?.startsWith('image/')) {
      setFile(null);
      setError('Choose an image in JPG, PNG, WebP, or AVIF format.');
      return;
    }

    if (nextFile.size > MAX_IMAGE_SIZE) {
      setFile(null);
      setError('The image must be no larger than 15 MB.');
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

    setUploading(true);
    setProgress(0);

    try {
      await uploadPhoto({ file, ...form }, setProgress);
      setNotice(
        form.published
          ? 'The image has been uploaded and published to the portfolio.'
          : 'The image has been saved as unpublished.'
      );
      setFile(null);
      setForm(initialForm());
    } catch (nextError) {
      setError(friendlyError(nextError));
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    setError('');
    try {
      await logout();
    } catch (nextError) {
      setError(friendlyError(nextError));
    }
  };

  return (
    <DashboardShell>
      <DashboardNav>
        <Brand />
        <DashboardNavRight>
          <OnlineStatus>
            <i />
            Connected
          </OnlineStatus>
          <UserEmail>{user?.email}</UserEmail>
          <LogoutButton type="button" onClick={handleLogout}>
            Sign out
          </LogoutButton>
        </DashboardNavRight>
      </DashboardNav>

      <DashboardHeading>
        <div>
          <Eyebrow>Private workspace</Eyebrow>
          <h1>
            Good evening, <em>Julian Bjørgen.</em>
          </h1>
          <p>Upload new work and publish it to the portfolio.</p>
        </div>
        <DashboardNumber aria-hidden="true">01</DashboardNumber>
      </DashboardHeading>

      <DashboardGrid>
        <UploadCard>
          <CardHeader>
            <span>New upload</span>
            <small>01 / IMAGE</small>
          </CardHeader>

          <UploadForm onSubmit={handleUpload}>
            <FileDropzone
              file={file}
              previewUrl={previewUrl}
              onFile={selectFile}
              disabled={uploading}
            />

            <FormGrid>
              <Field $wide>
                <label htmlFor="photo-title">Title</label>
                <input
                  id="photo-title"
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  placeholder="For example: Between the Mountains"
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
                  <span>⌄</span>
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
                  Eligible for the home page
                </span>
              </ToggleLabel>
            </ToggleGroup>

            {uploading && (
              <ProgressWrap aria-live="polite">
                <ProgressMeta>
                  <span>Uploading to Firebase</span>
                  <strong>{progress}%</strong>
                </ProgressMeta>
                <ProgressTrack>
                  <i style={{ width: `${progress}%` }} />
                </ProgressTrack>
              </ProgressWrap>
            )}

            {error && <FormMessage $error role="alert">{error}</FormMessage>}
            {notice && <FormMessage role="status">{notice}</FormMessage>}

            <PublishButton type="submit" disabled={uploading}>
              <span>{uploading ? 'Uploading…' : 'Upload image'}</span>
              <UploadIcon />
            </PublishButton>
          </UploadForm>
        </UploadCard>

        <SideColumn>
          <StatsCard>
            <CardHeader>
              <span>Portfolio</span>
              <small>LIVE</small>
            </CardHeader>
            <StatsBody>
              <StatNumber>{publishedPhotos.length}</StatNumber>
              <p>published images</p>
              <LiveLine>
                <i />
                Synced live from Firestore
              </LiveLine>
            </StatsBody>
          </StatsCard>

          <RecentCard>
            <CardHeader>
              <span>Recently published</span>
              <small>{galleryError ? 'UNAVAILABLE' : 'LIVE'}</small>
            </CardHeader>
            {publishedPhotos.length > 0 ? (
              <RecentGrid>
                {publishedPhotos.slice(0, 4).map((photo) => (
                  <RecentPhoto key={photo.id}>
                    <img
                      src={photo.url}
                      alt={photo.alt || photo.title}
                      width="400"
                      height="300"
                      loading="lazy"
                    />
                    <span>{photo.title}</span>
                  </RecentPhoto>
                ))}
              </RecentGrid>
            ) : (
              <EmptyRecent>
                <span>No published images yet.</span>
                <small>Your first upload will appear here.</small>
              </EmptyRecent>
            )}
          </RecentCard>

          <TipCard>
            <span>JULIAN BJØRGEN NOTE / 01</span>
            <p>
              Precise alt text makes the portfolio easier to discover and more
              useful to visitors who rely on screen readers.
            </p>
          </TipCard>
        </SideColumn>
      </DashboardGrid>
    </DashboardShell>
  );
}

export function StudioPage() {
  const { user, loading, configured } = useAuth();

  if (loading) {
    return <LoadingView />;
  }

  if (!configured) {
    return <SetupView />;
  }

  return user ? <StudioDashboard /> : <LoginView />;
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
  text-decoration: none;
  font-family: Arial, Helvetica, sans-serif;
  font-weight: 800;
  font-size: 14px;
  line-height: 1;
  letter-spacing: 0.16em;

  small {
    display: block;
    margin-top: 5px;
    color: ${({ $dark }) =>
      $dark ? 'rgba(17, 17, 15, .52)' : 'rgba(245, 241, 232, .55)'};
    font-size: 7px;
    font-weight: 500;
    letter-spacing: 0.21em;
  }
`;

const BrandMark = styled.b`
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid
    ${({ $dark }) =>
      $dark ? 'rgba(17, 17, 15, .25)' : 'rgba(245, 241, 232, .35)'};
  border-radius: 50%;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 20px;
  font-style: italic;
  font-weight: 400;
  letter-spacing: 0;
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
    url('https://static.wixstatic.com/media/29cc10_0ee30b9811de42f3bd6fee755601be0e~mv2.jpg/v1/fill/w_1600,h_1800,al_c,q_90/billie-eilish.jpg')
      center/cover;
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
  writing-mode: vertical-rl;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.22em;
`;

const LoginPanel = styled.section`
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  justify-content: center;
  padding: clamp(52px, 9vw, 120px) clamp(28px, 7vw, 112px) 28px;
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
  font: 600 9px/1 Arial, Helvetica, sans-serif;
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
  padding-top: 35px;
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
  padding: 0 clamp(22px, 4.5vw, 70px);
  border-bottom: 1px solid rgba(238, 236, 228, 0.12);
`;

const DashboardNavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 22px;

  @media (max-width: 650px) {
    gap: 10px;
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

  @media (max-width: 650px) {
    display: none;
  }
`;

const UserEmail = styled.span`
  color: rgba(238, 236, 228, 0.38);
  font-size: 9px;

  @media (max-width: 760px) {
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

const DashboardHeading = styled.header`
  position: relative;
  display: flex;
  max-width: 1440px;
  align-items: flex-end;
  justify-content: space-between;
  margin: 0 auto;
  padding: clamp(70px, 10vw, 145px) clamp(22px, 4.5vw, 70px)
    clamp(45px, 6vw, 80px);
  overflow: hidden;
  animation: ${pageFade} 0.6s ease both;

  h1 {
    position: relative;
    z-index: 1;
    margin: 23px 0 15px;
    font: 400 clamp(48px, 6.5vw, 94px) / 0.9 Georgia, 'Times New Roman',
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
  right: 3%;
  bottom: -0.1em;
  color: rgba(238, 236, 228, 0.025);
  font: 400 clamp(180px, 30vw, 430px) / 0.75 Georgia, serif;
  letter-spacing: -0.08em;
`;

const DashboardGrid = styled.div`
  display: grid;
  width: min(calc(100% - 44px), 1300px);
  margin: 0 auto;
  grid-template-columns: minmax(0, 1.55fr) minmax(290px, 0.75fr);
  gap: 20px;
  animation: ${pageFade} 0.6s 0.12s ease both;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const UploadCard = styled.section`
  background: #e9e6dc;
  color: #11110f;
`;

const CardHeader = styled.header`
  display: flex;
  height: 58px;
  align-items: center;
  justify-content: space-between;
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
    ${({ $dragging }) => ($dragging ? '#c54a2c' : 'rgba(17, 17, 15, .25)')};
  background: ${({ $dragging }) =>
    $dragging ? 'rgba(197,74,44,.08)' : 'rgba(255,255,255,.19)'};
  place-items: center;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
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
    appearance: none;
    padding-right: 42px;
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

  svg {
    width: 18px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &:hover:not(:disabled) {
    background: #11110f;
  }
`;

const SideColumn = styled.aside`
  display: grid;
  align-content: start;
  gap: 20px;
`;

const StatsCard = styled.section`
  background: #cf5635;
  color: #11110f;
`;

const StatsBody = styled.div`
  padding: 29px 24px 24px;

  > p {
    margin: -7px 0 28px;
    font: italic 400 21px/1 Georgia, 'Times New Roman', serif;
  }
`;

const StatNumber = styled.strong`
  display: block;
  font: 400 98px/0.92 Georgia, 'Times New Roman', serif;
  letter-spacing: -0.08em;
`;

const LiveLine = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 17px;
  border-top: 1px solid rgba(17, 17, 15, 0.2);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;

  i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #11110f;
  }
`;

const RecentCard = styled.section`
  background: #e9e6dc;
  color: #11110f;
`;

const RecentGrid = styled.div`
  display: grid;
  padding: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`;

const RecentPhoto = styled.figure`
  position: relative;
  min-height: 128px;
  margin: 0;
  overflow: hidden;
  background: #c9c6bc;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.35s ease;
  }

  span {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    overflow: hidden;
    padding: 22px 9px 8px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.65));
    color: white;
    font-size: 8px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover img {
    transform: scale(1.035);
  }
`;

const EmptyRecent = styled.div`
  display: flex;
  min-height: 175px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 24px;
  text-align: center;

  span {
    font: 400 20px/1.2 Georgia, 'Times New Roman', serif;
  }

  small {
    margin-top: 8px;
    color: rgba(17, 17, 15, 0.4);
    font-size: 9px;
  }
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
