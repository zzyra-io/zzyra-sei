import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/wallets
 * Retrieves the user's wallets
 */
export async function GET() {
  try {
    const session = await getServerSession();
    console.log('GET /api/user/wallets - Session:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      userEmail: session?.user?.email 
    });
    
    if (!session?.user?.id) {
      console.error('GET /api/user/wallets - Unauthorized: No valid user ID in session');
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user wallets from database
    console.log(`Fetching wallets for user ID: ${session.user.id}`);
    const wallets = await prisma.userWallet.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${wallets.length} wallets for user`);
    return NextResponse.json(wallets);
  } catch (error) {
    console.error('Error fetching user wallets:', error);
    return NextResponse.json(
      { message: 'Failed to fetch user wallets', error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/wallets
 * Creates or updates a user wallet
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    console.log('POST /api/user/wallets - Session:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      fullSession: JSON.stringify(session)
    });
    
    if (!session?.user?.id) {
      console.error('POST /api/user/wallets - Unauthorized: No valid user ID in session');
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    console.log('POST /api/user/wallets - Request data:', data);
    
    const { walletAddress, chainId, walletType, chainType, metadata } = data;
    
    if (!walletAddress || !chainId) {
      console.error('POST /api/user/wallets - Missing required fields:', { walletAddress, chainId });
      return NextResponse.json(
        { message: 'Wallet address and chain ID are required' },
        { status: 400 }
      );
    }

    // Check if wallet exists for this specific user
    // Note: We're checking for wallet existence regardless of user to understand if we have an issue with the unique constraint
    const existingWalletAnyUser = await prisma.userWallet.findFirst({
      where: {
        walletAddress,
      },
    });
    
    const existingWallet = await prisma.userWallet.findFirst({
      where: {
        walletAddress,
        userId: session.user.id, // Only find wallets for this specific user
      },
    });
    
    console.log('Wallet existence check:', { 
      walletExistsForAnyUser: !!existingWalletAnyUser,
      walletOwner: existingWalletAnyUser?.userId,
      walletExistsForCurrentUser: !!existingWallet,
      currentUserId: session.user.id,
      walletAddress
    });

    console.log('Existing wallet check:', { 
      exists: !!existingWallet,
      walletId: existingWallet?.id,
      walletAddress,
      userId: session.user.id
    });

    let wallet;
    
    if (existingWallet) {
      // Update existing wallet
      console.log(`Updating existing wallet ID: ${existingWallet.id}`);
      wallet = await prisma.userWallet.update({
        where: {
          id: existingWallet.id,
        },
        data: {
          chainId: chainId.toString(),
          walletType: walletType || existingWallet.walletType,
          chainType: chainType || existingWallet.chainType,
          // Merge existing metadata with new metadata to preserve information
          metadata: {
            ...(typeof existingWallet.metadata === 'object' ? existingWallet.metadata : {}),
            ...(metadata || {}),
            lastUpdated: new Date().toISOString(),
          },
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new wallet
      console.log(`Creating new wallet for user ID: ${session.user.id}`);
      try {
        // Attempt to create the wallet in the database
        wallet = await prisma.userWallet.create({
          data: {
            userId: session.user.id,
            walletAddress,
            chainId: chainId.toString(),
            walletType: walletType || 'unknown',
            chainType: chainType || 'evm', // Default to EVM
            metadata: {
              ...(typeof metadata === 'object' ? metadata : {}),
              createdAt: new Date().toISOString(),
              userEmail: session.user.email,
            },
          },
        });
        console.log('New wallet created successfully:', wallet);
      } catch (createError) {
        console.error('Error creating wallet:', createError);
        
        // If wallet already exists for another user, return a clear error
        if (existingWalletAnyUser && existingWalletAnyUser.userId !== session.user.id) {
          console.error(`Wallet ${walletAddress} is already connected to user ${existingWalletAnyUser.userId}`);
          return NextResponse.json(
            { 
              message: 'This wallet is already connected to another account',
              error: 'WALLET_ALREADY_CONNECTED',
              walletAddress 
            },
            { status: 409 } // Conflict
          );
        }
        
        // Re-throw for other errors
        throw createError;
      }
    }

    // Add more details to the response for debugging
    return NextResponse.json({
      wallet,
      success: true,
      message: existingWallet ? 'Wallet updated' : 'Wallet created',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving user wallet:', error);
    return NextResponse.json(
      { message: 'Failed to save user wallet' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/wallets
 * Deletes a user wallet
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    console.log('DELETE /api/user/wallets - Session:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      userEmail: session?.user?.email 
    });
    
    if (!session?.user?.id) {
      console.error('DELETE /api/user/wallets - Unauthorized: No valid user ID in session');
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const walletId = searchParams.get('id');
    console.log(`DELETE /api/user/wallets - Requested wallet ID: ${walletId}`);
    
    if (!walletId) {
      console.error('DELETE /api/user/wallets - Missing wallet ID parameter');
      return NextResponse.json(
        { message: 'Wallet ID is required' },
        { status: 400 }
      );
    }

    // Check if wallet belongs to user
    console.log(`Checking if wallet ID ${walletId} belongs to user ID ${session.user.id}`);
    const wallet = await prisma.userWallet.findUnique({
      where: {
        id: walletId,
      },
    });

    console.log('Wallet ownership check:', { 
      found: !!wallet, 
      walletOwner: wallet?.userId,
      currentUser: session.user.id,
      isOwner: wallet?.userId === session.user.id
    });

    if (!wallet || wallet.userId !== session.user.id) {
      console.error(`Wallet not found or not owned by user. WalletId: ${walletId}, UserId: ${session.user.id}`);
      return NextResponse.json(
        { message: 'Wallet not found or not owned by user' },
        { status: 404 }
      );
    }

    // Delete wallet
    console.log(`Deleting wallet ID ${walletId} for user ID ${session.user.id}`);
    await prisma.userWallet.delete({
      where: {
        id: walletId,
      },
    });
    console.log(`Wallet ID ${walletId} deleted successfully`);

    return NextResponse.json({ success: true, walletId });
  } catch (error) {
    console.error('Error deleting user wallet:', error);
    return NextResponse.json(
      { message: 'Failed to delete user wallet' },
      { status: 500 }
    );
  }
}
