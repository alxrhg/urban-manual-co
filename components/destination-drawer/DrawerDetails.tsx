'use client';

import { MapPin, Clock, Phone, Globe, DollarSign } from 'lucide-react';
import { stripHtmlTags } from '@/lib/stripHtmlTags';

interface DrawerDetailsProps {
    name: string;
    city: string;
    category?: string;
    description?: string;
    formattedAddress?: string;
    phone?: string;
    website?: string;
    rating?: number;
    userRatingsTotal?: number;
    priceLevel?: number;
    openingHours?: any;
    isOpen?: boolean;
    todayHours?: string;
    michelinStars?: number | null;
    crown?: boolean;
}

export function DrawerDetails({
    name,
    city,
    category,
    description,
    formattedAddress,
    phone,
    website,
    rating,
    userRatingsTotal,
    priceLevel,
    openingHours,
    isOpen,
    todayHours,
    michelinStars,
    crown,
}: DrawerDetailsProps) {
    const capitalizeCity = (city: string) => {
        return city
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const extractDomain = (url: string): string => {
        try {
            let cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
            cleanUrl = cleanUrl.split('/')[0].split('?')[0];
            return cleanUrl;
        } catch {
            return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        }
    };

    return (
        <div className="space-y-6">
            {/* Title & Location */}
            <div>
                <div className="flex items-start gap-2 mb-2">
                    <h1 className="text-2xl font-bold flex-1">{name}</h1>
                    {crown && <span className="text-2xl">👑</span>}
                    {michelinStars && michelinStars > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            {Array.from({ length: michelinStars }).map((_, i) => (
                                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    <span>{capitalizeCity(city)}</span>
                    {category && (
                        <>
                            <span>•</span>
                            <span className="capitalize">{category}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Rating & Price */}
            {(rating || priceLevel) && (
                <div className="flex items-center gap-4">
                    {rating && (
                        <div className="flex items-center gap-1">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="font-medium">{rating.toFixed(1)}</span>
                            {userRatingsTotal && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    ({userRatingsTotal.toLocaleString()})
                                </span>
                            )}
                        </div>
                    )}
                    {priceLevel && (
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            {Array.from({ length: priceLevel }).map((_, i) => (
                                <DollarSign key={i} className="h-4 w-4" />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Opening Hours */}
            {todayHours && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    <Clock className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                                {isOpen ? 'Open now' : 'Closed'}
                            </span>
                            {isOpen !== undefined && (
                                <span className={`h-2 w-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                            )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{todayHours}</p>
                    </div>
                </div>
            )}

            {/* Description */}
            {description && (
                <div>
                    <h3 className="font-semibold mb-2">About</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        {stripHtmlTags(description)}
                    </p>
                </div>
            )}

            {/* Contact Info */}
            {(formattedAddress || phone || website) && (
                <div className="space-y-3">
                    <h3 className="font-semibold">Contact</h3>

                    {formattedAddress && (
                        <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 mt-1 flex-shrink-0 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {formattedAddress}
                            </span>
                        </div>
                    )}

                    {phone && (
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            <a
                                href={`tel:${phone}`}
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                            >
                                {phone}
                            </a>
                        </div>
                    )}

                    {website && (
                        <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 flex-shrink-0 text-gray-400" />
                            <a
                                href={website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors truncate"
                            >
                                {extractDomain(website)}
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
