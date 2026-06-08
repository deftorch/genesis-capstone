import { NextResponse } from 'next/server';
import { API_CONFIG } from '@/config/constants';
import { uploadRateLimiter } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')
          ?? req.headers.get('x-real-ip')
          ?? 'anonymous';

  try {
    uploadRateLimiter.check(10, ip);
  } catch {
    return NextResponse.json(
      { error: 'Too many upload requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file magic bytes (binary signature)
    const arrayBuffer = await file.arrayBuffer();
    // Ambil 12 byte untuk validasi WebP yang benar
    const bytes = new Uint8Array(arrayBuffer.slice(0, 12));
    let header = '';
    for (let i = 0; i < 4; i++) {
      header += bytes[i].toString(16).padStart(2, '0').toUpperCase();
    }

    const isJpeg = header.startsWith('FFD8FF');
    const isPng = header.startsWith('89504E47');
    const isGif = header.startsWith('47494638');

    // WebP: RIFF di byte 0-3 DAN 'WEBP' di byte 8-11
    const webpSignature = Array.from(bytes.slice(8, 12))
      .map(b => String.fromCharCode(b))
      .join('');
    const isWebp = header.startsWith('52494646') && webpSignature === 'WEBP';

    if (!isJpeg && !isPng && !isGif && !isWebp) {
      return NextResponse.json(
        { error: 'Invalid image signature. Only real JPEG, PNG, GIF, and WebP files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB for ThumbSnap)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Supabase storage is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.' },
        { status: 501 }
      );
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('genesis-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        logger.error('Supabase upload error', { error: uploadError.message });
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('genesis-images')
        .getPublicUrl(fileName);

      return NextResponse.json({
        success: true,
        url: publicUrl,
        filename: file.name,
        provider: 'supabase'
      });
    } catch (storageError: any) {
      logger.error('Storage error', { error: storageError.message });
      return NextResponse.json(
        { 
          error: 'Failed to upload image to storage',
          details: storageError.message 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error('Image upload error', { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
