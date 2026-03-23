import client from '../lib/openai';

interface UserData {
  name: string;
  email: string;
  phone: string;
  ssn: string;
}

export async function analyzeUser(userData: UserData) {
  const prompt = `Analyze this customer profile: Name: ${userData.name}, Email: ${userData.email}, Phone: ${userData.phone}, SSN: ${userData.ssn}`;
  const response = await client.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }]
  });
  return response.choices[0].message.content;
}
