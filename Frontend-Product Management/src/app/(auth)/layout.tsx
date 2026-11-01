import styles from './auth.module.css';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.authContainer}>
      {/* Left Panel - Branding */}
      <div className={styles.authLeft}>
        <div className={styles.brandingContent}>
          <div className={styles.illustrationWrapper}>
            <BusinessCenterOutlinedIcon
              className={styles.illustrationIcon}
              sx={{ fontSize: 120 }}
            />
          </div>
          <h1 className={styles.brandTitle}>Management Portal</h1>
          <p className={styles.brandSubtitle}>
            Streamline your operations with a centralized platform for managing
            employees, roles, and modules efficiently.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className={styles.authRight}>
        <div className={styles.formWrapper}>
          {children}
        </div>
      </div>
    </div>
  );
}

