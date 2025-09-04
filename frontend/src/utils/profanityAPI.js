export async function checkProfanity(message) {
    try {
      const res = await fetch('https://vector.profanity.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
  
      if (!res.ok) {
        throw new Error('Failed to check profanity');
      }
  
      const data = await res.json();
      return data; // e.g., { isProfane: true, matches: ["badword"] }
    } catch (error) {
      console.error('Error checking profanity:', error);
      return null;
    }
  }