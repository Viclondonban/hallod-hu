"use server";

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

// 1. Fetch all podcasts for the manager to display
export async function getAllPodcasts() {
  return await prisma.podcast.findMany({
    select: { id: true, title: true, isActive: true, category: true },
    orderBy: { title: 'asc' }
  });
}

// 2. Toggle the active status (Hide/Unhide)
export async function togglePodcastStatus(id: string, currentStatus: boolean) {
  await prisma.podcast.update({
    where: { id },
    data: { isActive: !currentStatus },
  });

  revalidatePath('/');
  revalidatePath('/admin');
}

// 3. Submit a new suggestion from the footer
export async function submitSuggestion(formData: FormData) {
  const content = formData.get("suggestion") as string;
  
  if (!content || content.trim() === "") return { error: "Üres mező!" };
  if (content.length > 500) return { error: "Túl hosszú! (Max 500 karakter)" };

  // Get IP for rate limiting
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") || "unknown";

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dailyCount = await prisma.suggestion.count({
    where: {
      ipAddress: ip,
      createdAt: { gte: twentyFourHoursAgo }
    }
  });

  if (dailyCount >= 5) return { error: "Napi limit elérve!" };

  await prisma.suggestion.create({
    data: { content: content.trim(), ipAddress: ip }
  });
  
  revalidatePath('/admin');
  return { success: true };
}

// 4. Delete a suggestion forever
export async function deleteSuggestion(id: string) {
  await prisma.suggestion.delete({ where: { id } });
  revalidatePath('/admin');
}