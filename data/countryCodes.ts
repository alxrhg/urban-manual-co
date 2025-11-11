interface CountryDefinition {
  name: string;
  iso2: string;
  iso3: string;
  aliases?: string[];
}

interface CountryLookups {
  byName: Map<string, CountryDefinition>;
  byIso2: Map<string, CountryDefinition>;
  byIso3: Map<string, CountryDefinition>;
}

const COUNTRY_DATA: CountryDefinition[] = [
  {
    name: 'United States',
    iso2: 'US',
    iso3: 'USA',
    aliases: ['USA', 'U.S.A', 'America', 'United States of America', 'US'],
  },
  {
    name: 'Canada',
    iso2: 'CA',
    iso3: 'CAN',
  },
  {
    name: 'Mexico',
    iso2: 'MX',
    iso3: 'MEX',
  },
  {
    name: 'United Kingdom',
    iso2: 'GB',
    iso3: 'GBR',
    aliases: ['UK', 'Great Britain', 'Britain', 'England'],
  },
  {
    name: 'France',
    iso2: 'FR',
    iso3: 'FRA',
  },
  {
    name: 'Spain',
    iso2: 'ES',
    iso3: 'ESP',
  },
  {
    name: 'Portugal',
    iso2: 'PT',
    iso3: 'PRT',
  },
  {
    name: 'Italy',
    iso2: 'IT',
    iso3: 'ITA',
  },
  {
    name: 'Germany',
    iso2: 'DE',
    iso3: 'DEU',
    aliases: ['Deutschland'],
  },
  {
    name: 'Netherlands',
    iso2: 'NL',
    iso3: 'NLD',
  },
  {
    name: 'Belgium',
    iso2: 'BE',
    iso3: 'BEL',
  },
  {
    name: 'Switzerland',
    iso2: 'CH',
    iso3: 'CHE',
  },
  {
    name: 'Austria',
    iso2: 'AT',
    iso3: 'AUT',
  },
  {
    name: 'Denmark',
    iso2: 'DK',
    iso3: 'DNK',
  },
  {
    name: 'Sweden',
    iso2: 'SE',
    iso3: 'SWE',
  },
  {
    name: 'Norway',
    iso2: 'NO',
    iso3: 'NOR',
  },
  {
    name: 'Finland',
    iso2: 'FI',
    iso3: 'FIN',
  },
  {
    name: 'Iceland',
    iso2: 'IS',
    iso3: 'ISL',
  },
  {
    name: 'Greece',
    iso2: 'GR',
    iso3: 'GRC',
  },
  {
    name: 'Turkey',
    iso2: 'TR',
    iso3: 'TUR',
  },
  {
    name: 'Japan',
    iso2: 'JP',
    iso3: 'JPN',
  },
  {
    name: 'Taiwan',
    iso2: 'TW',
    iso3: 'TWN',
    aliases: ['Republic of China'],
  },
  {
    name: 'Singapore',
    iso2: 'SG',
    iso3: 'SGP',
  },
  {
    name: 'Hong Kong',
    iso2: 'HK',
    iso3: 'HKG',
  },
  {
    name: 'South Korea',
    iso2: 'KR',
    iso3: 'KOR',
    aliases: ['Republic of Korea', 'Korea'],
  },
  {
    name: 'China',
    iso2: 'CN',
    iso3: 'CHN',
    aliases: ['People\'s Republic of China', 'PRC'],
  },
  {
    name: 'Thailand',
    iso2: 'TH',
    iso3: 'THA',
  },
  {
    name: 'Vietnam',
    iso2: 'VN',
    iso3: 'VNM',
  },
  {
    name: 'Malaysia',
    iso2: 'MY',
    iso3: 'MYS',
  },
  {
    name: 'Indonesia',
    iso2: 'ID',
    iso3: 'IDN',
  },
  {
    name: 'Philippines',
    iso2: 'PH',
    iso3: 'PHL',
  },
  {
    name: 'United Arab Emirates',
    iso2: 'AE',
    iso3: 'ARE',
    aliases: ['UAE'],
  },
  {
    name: 'Australia',
    iso2: 'AU',
    iso3: 'AUS',
  },
  {
    name: 'New Zealand',
    iso2: 'NZ',
    iso3: 'NZL',
  },
  {
    name: 'Brazil',
    iso2: 'BR',
    iso3: 'BRA',
  },
  {
    name: 'Argentina',
    iso2: 'AR',
    iso3: 'ARG',
  },
  {
    name: 'South Africa',
    iso2: 'ZA',
    iso3: 'ZAF',
  },
  {
    name: 'Morocco',
    iso2: 'MA',
    iso3: 'MAR',
  },
  {
    name: 'Egypt',
    iso2: 'EG',
    iso3: 'EGY',
  },
  {
    name: 'Israel',
    iso2: 'IL',
    iso3: 'ISR',
  },
  {
    name: 'Jordan',
    iso2: 'JO',
    iso3: 'JOR',
  },
  {
    name: 'Lebanon',
    iso2: 'LB',
    iso3: 'LBN',
  },
];

const lookups: CountryLookups = COUNTRY_DATA.reduce(
  (acc, country) => {
    const register = (key: string) => {
      acc.byName.set(key, country);
    };

    register(normalize(country.name));

    if (country.aliases) {
      country.aliases.forEach((alias) => register(normalize(alias)));
    }

    acc.byIso2.set(country.iso2.toUpperCase(), country);
    acc.byIso3.set(country.iso3.toUpperCase(), country);

    return acc;
  },
  {
    byName: new Map<string, CountryDefinition>(),
    byIso2: new Map<string, CountryDefinition>(),
    byIso3: new Map<string, CountryDefinition>(),
  }
);

function normalize(value?: string | null): string {
  if (!value) return '';
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function getCountryInfo(input?: string | null): CountryDefinition | null {
  if (!input) return null;

  const normalized = normalize(input);
  if (normalized && lookups.byName.has(normalized)) {
    return lookups.byName.get(normalized)!;
  }

  const upper = input.toUpperCase();
  if (lookups.byIso2.has(upper)) {
    return lookups.byIso2.get(upper)!;
  }

  if (lookups.byIso3.has(upper)) {
    return lookups.byIso3.get(upper)!;
  }

  return null;
}

export function getCountryName(input?: string | null): string | null {
  const info = getCountryInfo(input);
  return info ? info.name : null;
}

export function getCountryIso2(input?: string | null): string | null {
  const info = getCountryInfo(input);
  return info ? info.iso2 : null;
}

export function getCountryIso3(input?: string | null): string | null {
  const info = getCountryInfo(input);
  return info ? info.iso3 : null;
}

export function getCountryDetails(input?: string | null) {
  const info = getCountryInfo(input);
  if (!info) return null;
  return {
    name: info.name,
    iso2: info.iso2,
    iso3: info.iso3,
  };
}

export function normalizeCountryName(input?: string | null): string | null {
  const info = getCountryInfo(input);
  return info ? info.name : input?.trim() || null;
}


