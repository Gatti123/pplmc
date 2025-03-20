import Link from 'next/link';
import { FaGithub, FaTwitter, FaLinkedin } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const FooterSection = ({ title, children }) => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );

  const FooterLink = ({ href, children }) => (
    <Link 
      href={href} 
      className="text-secondary hover:text-white transition-colors duration-300 text-sm block"
    >
      {children}
    </Link>
  );

  const SocialLink = ({ href, icon: Icon }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-secondary hover:text-white transition-colors duration-300"
    >
      <Icon className="w-5 h-5" />
    </a>
  );

  return (
    <footer className="bg-primary text-secondary py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <FooterSection title="Polemica">
            <p className="text-sm">
              Connect with others through meaningful discussions in a video chat format.
            </p>
            <div className="flex space-x-4 pt-2">
              <SocialLink href="https://github.com" icon={FaGithub} />
              <SocialLink href="https://twitter.com" icon={FaTwitter} />
              <SocialLink href="https://linkedin.com" icon={FaLinkedin} />
            </div>
          </FooterSection>
          
          <FooterSection title="Quick Links">
            <FooterLink href="/">Home</FooterLink>
            <FooterLink href="/about">About</FooterLink>
            <FooterLink href="/rules">Platform Rules</FooterLink>
            <FooterLink href="/contact">Contact</FooterLink>
          </FooterSection>
          
          <FooterSection title="Support">
            <FooterLink href="/faq">FAQ</FooterLink>
            <FooterLink href="/help">Help Center</FooterLink>
            <FooterLink href="/feedback">Feedback</FooterLink>
            <FooterLink href="/report">Report Issue</FooterLink>
          </FooterSection>
          
          <FooterSection title="Legal">
            <FooterLink href="/privacy">Privacy Policy</FooterLink>
            <FooterLink href="/terms">Terms of Service</FooterLink>
            <FooterLink href="/cookies">Cookie Policy</FooterLink>
            <FooterLink href="/disclaimer">Disclaimer</FooterLink>
          </FooterSection>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-center md:text-left">
              &copy; {currentYear} Polemica. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <FooterLink href="/sitemap">Sitemap</FooterLink>
              <FooterLink href="/accessibility">Accessibility</FooterLink>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 