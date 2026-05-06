// Debug utility to test API login
// This file can be used to debug login issues

import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';

export async function testLogin(email: string, password: string) {
  console.log('🔍 Testing Login API...');
  console.log('URL:', `${API_BASE_URL}${API_ENDPOINTS.LOGIN}`);
  console.log('Body:', { email, password });

  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.LOGIN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    let data: any;
    if (isJson) {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { raw: text };
      }
    } else {
      data = await response.text();
    }

    console.log('Response Data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('Access Token:', data.access || data.access_token ? 'Present' : 'MISSING');
      console.log('Refresh Token:', data.refresh || data.refresh_token ? 'Present' : 'MISSING');
    } else {
      console.log('❌ Login failed');
      console.log('Error:', data);
    }

    return { status: response.status, data, ok: response.ok };
  } catch (error: any) {
    console.error('❌ Network Error:', error);
    return { status: 0, error: error.message, ok: false };
  }
}

