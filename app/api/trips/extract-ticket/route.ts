import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { withErrorHandling, createValidationError } from '@/lib/errors';

/**
 * Extracted flight information from e-ticket
 */
interface ExtractedFlightInfo {
  airline?: string;
  flightNumber?: string;
  departureAirport?: string;
  departureCity?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalAirport?: string;
  arrivalCity?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  passengerName?: string;
  confirmationNumber?: string;
  seatNumber?: string;
  terminal?: string;
  gate?: string;
}

/**
 * POST /api/trips/extract-ticket
 * Extract flight information from an e-ticket image or text
 *
 * Body:
 * - image: base64 encoded image (optional)
 * - text: raw text from ticket (optional)
 * - mimeType: image mime type if image is provided (default: image/jpeg)
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { image, text, mimeType = 'image/jpeg' } = body;

  if (!image && !text) {
    throw createValidationError('Either image or text must be provided');
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw createValidationError('AI service not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Use vision model for images, text model for text
  const model = image
    ? genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })
    : genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  const extractionPrompt = `Extract flight/travel information from this ${image ? 'e-ticket image' : 'text'}.
Look for:
- Airline name and flight number
- Departure airport (IATA code like JFK, LAX) and city
- Arrival airport (IATA code) and city
- Departure date and time
- Arrival date and time
- Passenger name
- Confirmation/booking number
- Seat number
- Terminal and gate (if shown)

Return ONLY valid JSON in this exact format (use null for missing fields):
{
  "airline": "string or null",
  "flightNumber": "string or null",
  "departureAirport": "IATA code or null",
  "departureCity": "string or null",
  "departureDate": "YYYY-MM-DD or null",
  "departureTime": "HH:MM or null",
  "arrivalAirport": "IATA code or null",
  "arrivalCity": "string or null",
  "arrivalDate": "YYYY-MM-DD or null",
  "arrivalTime": "HH:MM or null",
  "passengerName": "string or null",
  "confirmationNumber": "string or null",
  "seatNumber": "string or null",
  "terminal": "string or null",
  "gate": "string or null"
}

Return ONLY the JSON, no other text.`;

  try {
    let result;

    if (image) {
      // Vision request with image
      result = await model.generateContent([
        extractionPrompt,
        {
          inlineData: {
            mimeType,
            data: image.replace(/^data:image\/\w+;base64,/, ''), // Strip data URL prefix if present
          },
        },
      ]);
    } else {
      // Text-only request
      result = await model.generateContent(`${extractionPrompt}\n\nTicket text:\n${text}`);
    }

    const responseText = result.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        success: false,
        error: 'Could not extract flight information',
        extracted: null,
      });
    }

    const extracted: ExtractedFlightInfo = JSON.parse(jsonMatch[0]);

    // Clean up null strings
    const cleanedExtracted = Object.fromEntries(
      Object.entries(extracted).map(([key, value]) => [
        key,
        value === 'null' || value === '' ? null : value,
      ])
    );

    // Derive destination from arrival info
    const destination = cleanedExtracted.arrivalCity || cleanedExtracted.arrivalAirport;
    const arrivalAirport = cleanedExtracted.arrivalAirport;
    const startDate = cleanedExtracted.departureDate;
    const endDate = cleanedExtracted.arrivalDate;

    return NextResponse.json({
      success: true,
      extracted: cleanedExtracted,
      // Suggested trip data derived from the ticket
      suggestedTrip: {
        destination,
        arrival_airport: arrivalAirport,
        start_date: startDate,
        end_date: endDate,
        title: destination ? `Trip to ${destination}` : null,
      },
    });
  } catch (error) {
    console.error('E-ticket extraction error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process ticket',
      extracted: null,
    });
  }
});
