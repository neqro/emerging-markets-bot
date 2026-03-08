import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "tr" | "en";

const translations = {
  // Auth
  "auth.login": { tr: "Giriş Yap", en: "Sign In" },
  "auth.signup": { tr: "Kayıt Ol", en: "Sign Up" },
  "auth.email": { tr: "Email", en: "Email" },
  "auth.password": { tr: "Şifre", en: "Password" },
  "auth.noAccount": { tr: "Hesabın yok mu? Kayıt ol", en: "Don't have an account? Sign up" },
  "auth.hasAccount": { tr: "Zaten hesabın var mı? Giriş yap", en: "Already have an account? Sign in" },
  "auth.emailVerify": { tr: "Kayıt başarılı! Email adresinizi doğrulayın.", en: "Registration successful! Verify your email." },
  "auth.invalidCreds": { tr: "Email veya şifre hatalı", en: "Invalid email or password" },
  "auth.passwordMin": { tr: "Şifre en az 6 karakter olmalı", en: "Password must be at least 6 characters" },
  "auth.subtitle": { tr: "Otonom Trading Terminali", en: "Autonomous Trading Terminal" },
  "auth.tagline": { tr: "Dahili cüzdan ile güvenli trade. Harici cüzdan bağlantısı gerekmez.", en: "Secure trading with built-in wallet. No external wallet needed." },

  // MFA
  "mfa.title": { tr: "2FA Doğrulama", en: "2FA Verification" },
  "mfa.desc": { tr: "Google Authenticator uygulamanızdaki 6 haneli kodu girin.", en: "Enter the 6-digit code from your Google Authenticator app." },
  "mfa.verify": { tr: "Doğrula", en: "Verify" },
  "mfa.back": { tr: "Geri dön", en: "Go back" },
  "mfa.verified": { tr: "2FA doğrulandı!", en: "2FA verified!" },

  // Settings
  "settings.title": { tr: "Ayarlar", en: "Settings" },
  "settings.profile": { tr: "Profil", en: "Profile" },
  "settings.username": { tr: "Kullanıcı Adı", en: "Username" },
  "settings.usernamePlaceholder": { tr: "Kullanıcı adınız...", en: "Your username..." },
  "settings.avatar": { tr: "Profil Resmi", en: "Avatar" },
  "settings.avatarDesc": { tr: "Avatar URL'si girin", en: "Enter avatar URL" },
  "settings.uploadAvatar": { tr: "Fotoğraf Yükle", en: "Upload Photo" },
  "settings.uploading": { tr: "Yükleniyor...", en: "Uploading..." },
  "settings.avatarUploaded": { tr: "Avatar yüklendi!", en: "Avatar uploaded!" },
  "settings.saveProfile": { tr: "Profili Kaydet", en: "Save Profile" },
  "settings.profileSaved": { tr: "Profil kaydedildi!", en: "Profile saved!" },
  "settings.language": { tr: "Dil", en: "Language" },
  "settings.appearance": { tr: "Görünüm Modu", en: "Appearance Mode" },
  "settings.theme": { tr: "Terminal Teması", en: "Terminal Theme" },
  "settings.customColor": { tr: "Özel Renk", en: "Custom Color" },
  "settings.applyCustom": { tr: "Özel Rengi Uygula", en: "Apply Custom Color" },
  "settings.security": { tr: "Güvenlik", en: "Security" },
  "settings.securityDesc": { tr: "2FA, Şifre, Oturumlar, Giriş Geçmişi", en: "2FA, Password, Sessions, Login History" },
  "settings.privateKey": { tr: "Private Key", en: "Private Key" },
  "settings.privateKeyDesc": { tr: "Private Key Dışa Aktar", en: "Export Private Key" },

  // Header
  "header.search": { tr: "Token ara...", en: "Search tokens..." },

  // Wallet
  "wallet.title": { tr: "Cüzdan", en: "Wallet" },
  "wallet.balance": { tr: "Bakiye", en: "Balance" },
  "wallet.deposit": { tr: "Deposit Adresi", en: "Deposit Address" },
  "wallet.depositDesc": { tr: "Bu adrese SOL göndererek bakiye yükle", en: "Send SOL to this address to top up" },
  "wallet.quickTrade": { tr: "⚡ Hızlı Trade", en: "⚡ Quick Trade" },
  "wallet.withdraw": { tr: "SOL Çek", en: "Withdraw SOL" },
  "wallet.exportKey": { tr: "Private Key Dışa Aktar", en: "Export Private Key" },
  "wallet.recentTrades": { tr: "Son İşlemler", en: "Recent Trades" },
  "wallet.noTrades": { tr: "Henüz işlem yok", en: "No trades yet" },
  "wallet.create": { tr: "Cüzdan Oluştur", en: "Create Wallet" },
  "wallet.createDesc": { tr: "Dahili cüzdan oluştur ve\nSOL yatırarak trade'e başla", en: "Create a built-in wallet and\nstart trading by depositing SOL" },
  "wallet.created": { tr: "Cüzdan oluşturuldu! SOL yatırarak trade'e başla.", en: "Wallet created! Deposit SOL to start trading." },
  "wallet.copied": { tr: "Adres kopyalandı!", en: "Address copied!" },
  "wallet.loading": { tr: "Yükleniyor...", en: "Loading..." },

  // Security
  "security.title": { tr: "Güvenlik", en: "Security" },
  "security.2fa": { tr: "İki Faktörlü Doğrulama (2FA)", en: "Two-Factor Authentication (2FA)" },
  "security.2faActive": { tr: "2FA Aktif", en: "2FA Active" },
  "security.2faProtected": { tr: "Google Authenticator ile korunuyor", en: "Protected by Google Authenticator" },
  "security.2faNotActive": { tr: "2FA henüz etkin değil", en: "2FA is not active yet" },
  "security.2faDesc": { tr: "Google Authenticator ile hesabınızı ekstra koruma altına alın.", en: "Protect your account with Google Authenticator." },
  "security.2faEnable": { tr: "2FA Etkinleştir", en: "Enable 2FA" },
  "security.2faDisable": { tr: "Kaldır", en: "Remove" },
  "security.2faDisabled": { tr: "2FA devre dışı bırakıldı", en: "2FA disabled" },
  "security.2faEnabled": { tr: "2FA başarıyla etkinleştirildi!", en: "2FA enabled successfully!" },
  "security.2faFailed": { tr: "2FA kurulumu başarısız", en: "2FA setup failed" },
  "security.2faScanQR": { tr: "Google Authenticator veya benzeri bir uygulama ile QR kodu tarayın:", en: "Scan the QR code with Google Authenticator or similar app:" },
  "security.2faManualCode": { tr: "Manuel giriş kodu:", en: "Manual entry code:" },
  "security.2faVerifyCode": { tr: "Doğrulama Kodu", en: "Verification Code" },
  "security.2faEnterCode": { tr: "6 haneli kod girin", en: "Enter 6-digit code" },
  "security.2faVerifyAndEnable": { tr: "Doğrula ve Etkinleştir", en: "Verify & Enable" },
  "security.2faVerifyFailed": { tr: "Doğrulama başarısız. Kodu kontrol edin.", en: "Verification failed. Check the code." },
  "security.changePassword": { tr: "Şifre Değiştir", en: "Change Password" },
  "security.currentPassword": { tr: "Mevcut Şifre", en: "Current Password" },
  "security.newPassword": { tr: "Yeni Şifre", en: "New Password" },
  "security.newPasswordRepeat": { tr: "Yeni Şifre (Tekrar)", en: "Confirm New Password" },
  "security.newPasswordMin": { tr: "En az 6 karakter", en: "At least 6 characters" },
  "security.passwordChanged": { tr: "Şifre başarıyla değiştirildi!", en: "Password changed successfully!" },
  "security.passwordMismatch": { tr: "Şifreler eşleşmiyor", en: "Passwords don't match" },
  "security.passwordWrong": { tr: "Mevcut şifre yanlış", en: "Current password is wrong" },
  "security.passwordNewMin": { tr: "Yeni şifre en az 6 karakter olmalı", en: "New password must be at least 6 characters" },
  "security.changePasswordBtn": { tr: "Şifreyi Değiştir", en: "Change Password" },
  "security.sessions": { tr: "Aktif Oturumlar", en: "Active Sessions" },
  "security.thisDevice": { tr: "Bu Cihaz (Aktif)", en: "This Device (Active)" },
  "security.sessionExpires": { tr: "Oturum sona eriyor:", en: "Session expires:" },
  "security.lastLogin": { tr: "Son giriş:", en: "Last login:" },
  "security.signOutAll": { tr: "Tüm Cihazlardan Çıkış Yap", en: "Sign Out All Devices" },
  "security.signedOutAll": { tr: "Tüm oturumlar kapatıldı. Tekrar giriş yapmanız gerekiyor.", en: "All sessions closed. You need to sign in again." },
  "security.loginHistory": { tr: "Giriş Geçmişi", en: "Login History" },
  "security.noLoginHistory": { tr: "Henüz giriş kaydı yok", en: "No login history yet" },
  "security.unknownDevice": { tr: "Bilinmeyen cihaz", en: "Unknown device" },
  "security.mobile": { tr: "📱 Mobil", en: "📱 Mobile" },
  "security.desktop": { tr: "🖥️ Masaüstü", en: "🖥️ Desktop" },
  "security.deleteAccount": { tr: "Hesap Silme", en: "Delete Account" },
  "security.deleteAccountDesc": { tr: "Hesabınızı silmek tüm verilerinizi, cüzdanınızı ve işlem geçmişinizi kalıcı olarak kaldırır.", en: "Deleting your account will permanently remove all your data, wallet, and transaction history." },
  "security.deleteAccountBtn": { tr: "Hesabımı Sil", en: "Delete My Account" },
  "security.deleteIrreversible": { tr: "Bu işlem geri alınamaz!", en: "This action cannot be undone!" },
  "security.deleteConfirmType": { tr: "Onaylamak için aşağıya", en: "Type below to confirm" },
  "security.deleteConfirmWord": { tr: "SİL", en: "DELETE" },
  "security.deleteContinue": { tr: "Devam Et", en: "Continue" },
  "security.deleteFinalStep": { tr: "Son adım: Hesap şifrenizi girin.", en: "Final step: Enter your account password." },
  "security.deleteAccountPassword": { tr: "Hesap Şifresi", en: "Account Password" },
  "security.deletePermanently": { tr: "Hesabı Kalıcı Olarak Sil", en: "Delete Account Permanently" },
  "security.accountDeleted": { tr: "Hesabınız silindi.", en: "Your account has been deleted." },

  // Export Key Dialog
  "exportKey.title": { tr: "Private Key Dışa Aktar", en: "Export Private Key" },
  "exportKey.warning": { tr: "Güvenlik Uyarısı", en: "Security Warning" },
  "exportKey.w1": { tr: "Private key'inizi asla kimseyle paylaşmayın", en: "Never share your private key with anyone" },
  "exportKey.w2": { tr: "Bu bilgiyi gören herkes cüzdanınıza erişebilir", en: "Anyone who sees this can access your wallet" },
  "exportKey.w3": { tr: "Güvenli bir ortamda olduğunuzdan emin olun", en: "Make sure you are in a secure environment" },
  "exportKey.w4": { tr: "Ekran paylaşımı veya kayıt yapılmadığından emin olun", en: "Make sure no screen sharing or recording is active" },
  "exportKey.continue": { tr: "Anlıyorum, Devam Et", en: "I Understand, Continue" },
  "exportKey.passwordDesc": { tr: "Kimliğinizi doğrulamak için hesap şifrenizi girin.", en: "Enter your account password to verify your identity." },
  "exportKey.accountPassword": { tr: "Hesap Şifresi", en: "Account Password" },
  "exportKey.verifyPassword": { tr: "Şifreyi Doğrula", en: "Verify Password" },
  "exportKey.verifying": { tr: "Doğrulanıyor...", en: "Verifying..." },
  "exportKey.confirmDesc": { tr: "Son güvenlik adımı: Onaylamak için aşağıya", en: "Final security step: Type" },
  "exportKey.confirmCode": { tr: "Onay Kodu", en: "Confirmation Code" },
  "exportKey.showKey": { tr: "Private Key'i Göster", en: "Show Private Key" },
  "exportKey.copied": { tr: "Private key kopyalandı!", en: "Private key copied!" },
  "exportKey.closeWarning": { tr: "Bu pencereyi kapattıktan sonra key tekrar gösterilmeyecek", en: "The key won't be shown again after closing this window" },

  // Favorites
  "favorites.title": { tr: "Favoriler", en: "Favorites" },
  "favorites.empty": { tr: "Henüz favori yok", en: "No favorites yet" },
  "favorites.emptyDesc": { tr: "Token ve wallet kartlarındaki ⭐ butonuna tıklayarak favori ekle", en: "Tap the ⭐ button on token and wallet cards to add favorites" },
  "favorites.tokens": { tr: "Tokenler", en: "Tokens" },
  "favorites.wallets": { tr: "Cüzdanlar", en: "Wallets" },

  // Common
  "common.loading": { tr: "Yükleniyor...", en: "Loading..." },
  "common.save": { tr: "Kaydet", en: "Save" },
  "common.cancel": { tr: "İptal", en: "Cancel" },
  "common.unknown": { tr: "Bilinmiyor", en: "Unknown" },
  "common.dark": { tr: "Dark Mode", en: "Dark Mode" },
  "common.light": { tr: "Light Mode", en: "Light Mode" },
} as const;

type TranslationKey = keyof typeof translations;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "solbot-language";

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as Language) || "tr";
    } catch {
      return "tr";
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
