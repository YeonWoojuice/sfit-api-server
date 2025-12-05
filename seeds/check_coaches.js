// Check coach data
const BASE_URL = 'http://localhost:4000/api';

async function checkCoaches() {
    try {
        const res = await fetch(`${BASE_URL}/coach`);
        const data = await res.json();

        console.log('📊 Coach List:');
        console.log(`Total Coaches: ${data.count}\n`);

        if (data.count === 0) {
            console.log('⚠️  No coaches found!');
            return;
        }

        data.coaches.forEach((c, i) => {
            console.log(`${i + 1}. ${c.name} (${c.region_code})`);
            console.log(`   - Sports: ${c.sport_names || 'N/A'}`);
            console.log(`   - Intro: ${c.introduction || 'N/A'}`);
            console.log(`   - Rating: ${c.rating || 0}`);
            console.log(`   - Age: ${c.age_group || 'N/A'}`);
            console.log(`   - Image: ${c.image_url ? 'Yes' : 'No'}`);
            console.log('');
        });
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkCoaches();
