import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  variant?: 'icon' | 'compact' | 'full';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'icon', className }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    try { localStorage.setItem('tela_lang', code); } catch {}
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={variant === 'icon' ? 'icon' : 'sm'}
          className={cn(
            variant === 'icon' && 'h-9 w-9 text-muted-foreground hover:text-foreground',
            variant === 'compact' && 'h-8 px-2 gap-1.5 text-[12px]',
            variant === 'full' && 'gap-2',
            className,
          )}
          aria-label={t('common.language')}
        >
          {variant === 'icon' ? (
            <Globe className="w-[16px] h-[16px]" />
          ) : (
            <>
              <Globe className="w-3.5 h-3.5" />
              <span className="font-medium">{current.code.toUpperCase()}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {SUPPORTED_LANGUAGES.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">{lang.flag}</span>
              <span className="text-sm">{lang.label}</span>
            </span>
            {lang.code === current.code && <Check className="w-3.5 h-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
