import { Link } from 'react-router-dom';
import rolaLogo from '@/assets/rola.svg';
interface FooterProps {
  onCookieSettingsClick?: () => void;
}
export const Footer = ({
  onCookieSettingsClick
}: FooterProps) => {
  const currentYear = new Date().getFullYear();
  return <footer className="w-full pb-6 px-4">
      <div className="flex flex-col items-center gap-4">
        {/* Logo and Author */}
        

        {/* Bottom Row */}
        <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
          {/* Copyright */}
          <div className="text-center sm:text-left">
            © {currentYear} Kosma Piekarski. All rights reserved.
          </div>

          {/* Legal Links */}
          <div className="flex gap-4 flex-wrap justify-center">
            <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
              Polityka prywatności
            </Link>
            <button onClick={onCookieSettingsClick} className="hover:text-foreground transition-colors">
              Cookies
            </button>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Regulamin strony
            </Link>
          </div>
        </div>
      </div>
    </footer>;
};