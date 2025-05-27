import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/wallets/transactions
 * Retrieves the user's wallet transactions
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('address');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
    
    let transactions;
    
    if (walletAddress) {
      // Get transactions for a specific wallet
      transactions = await prisma.walletTransaction.findMany({
        where: {
          userId: session.user.id,
          walletAddress,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });
    } else {
      // Get all transactions for the user
      transactions = await prisma.walletTransaction.findMany({
        where: {
          userId: session.user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      });
    }

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return NextResponse.json(
      { message: 'Failed to fetch wallet transactions' },
      { status: 500 }
    );
  }
}
