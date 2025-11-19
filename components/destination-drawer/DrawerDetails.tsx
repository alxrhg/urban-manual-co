'use client';

import { MapPin, Clock, Phone, Globe, Star, DollarSign } from 'lucide-react';
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
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
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
