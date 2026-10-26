const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Running standalone seed...');
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email: 'judge.demo@gapfinder.ai' }
  });

  if (existingUser) {
    console.log('Judge demo user already exists.');
    return;
  }

  // Create user
  await prisma.user.create({
    data: {
      id: 'user-judge-demo',
      email: 'judge.demo@gapfinder.ai',
      name: 'Honorable Judge / Evaluator',
      role: 'evaluator',
    }
  });

  console.log('Seed finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
