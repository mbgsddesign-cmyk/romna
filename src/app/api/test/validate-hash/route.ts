
import { NextResponse } from 'next/server';

export async function GET() {
  const generateHash = (timestamp: string, data: any) => {
    // Logic from AutoGLM
    const timeBucket = timestamp.slice(0, 13); // Hourly bucket
    
    const hashableContext = {
      ...data,
      current_time: timeBucket
    };

    const contextString = JSON.stringify(hashableContext);
    return Buffer.from(contextString).toString('base64').substring(0, 32);
  };

  const data = { task: 'test' };
  
  // Test 1: Same hour, different minutes/seconds
  const t1 = "2025-12-12T10:00:00.000Z";
  const t2 = "2025-12-12T10:59:59.999Z";
  
  const h1 = generateHash(t1, data);
  const h2 = generateHash(t2, data);
  
  // Test 2: Different hour
  const t3 = "2025-12-12T11:00:00.000Z";
  const h3 = generateHash(t3, data);

  return NextResponse.json({
    sameBucket: {
      t1, t2,
      match: h1 === h2,
      h1, h2
    },
    differentBucket: {
      t1, t3,
      match: h1 === h3,
      h1, h3
    },
    success: h1 === h2 && h1 !== h3
  });
}
