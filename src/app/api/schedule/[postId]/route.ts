import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authedRoute, bad, ok } from "@/lib/api-helpers";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  return authedRoute(req, async (user) => {
    const post = await prisma.post.findFirst({
      where: { id: postId, userId: user.id },
      include: { scheduledJob: true },
    });
    if (!post) return bad("Post not found", 404);
    const [, updated] = await prisma.$transaction([
      prisma.scheduledJob.deleteMany({ where: { postId: post.id } }),
      prisma.post.update({
        where: { id: post.id },
        data: { status: "DRAFT", scheduledAt: null },
      }),
    ]);
    return ok({ post: updated });
  });
}
