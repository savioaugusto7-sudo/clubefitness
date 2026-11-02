const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const punches = await prisma.punch.findMany({
    where: {
      data: {
        gte: new Date('2026-10-01T00:00:00.000Z'),
        lte: new Date('2026-10-01T23:59:59.999Z')
      }
    },
    include: {
      professional: {
        include: { user: true }
      }
    }
  });
  console.log(punches.map(p => ({
    name: p.professional?.user?.name,
    horaEntrada: p.horaEntrada,
    minutosAtraso: p.minutosAtraso
  })));
}

main().finally(() => prisma.$disconnect());
