import { useTranslation } from '@sdppp/common';
import { ProviderMetadata } from '../../providers/metadata';
import './ProviderCard.less';

interface ProviderCardProps {
    provider: ProviderMetadata;
    isSelected?: boolean;
    onClick: () => void;
}

export function ProviderCard({ provider, isSelected = false, onClick }: ProviderCardProps) {
    const { t } = useTranslation();

    return (
        <div 
            className={`provider-card ${provider.id.toLowerCase()} ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
        >
            <div className="provider-logo-section">
                <div className="provider-icon">
                    <img 
                        src={provider.logoPath} 
                        alt={provider.name}
                        onError={(e) => {
                            // Fallback to first letter if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) {
                                fallback.style.display = 'flex';
                            }
                        }}
                    />
                    <div 
                        className="provider-icon-fallback"
                        style={{ display: 'none' }}
                    >
                        {provider.name.charAt(0)}
                    </div>
                </div>
            </div>
            <div className="provider-content-section">
                <div className="provider-name">{provider.name}</div>
                <div className="provider-description">{t(provider.description)}</div>
            </div>
        </div>
    );
}