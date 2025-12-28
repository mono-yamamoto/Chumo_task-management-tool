import {
  collection,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Task } from '@/types';
import { PROJECT_TYPES, ProjectType } from '@/constants/projectTypes';
import { mapTaskDoc } from '@/lib/firestore/mappers/taskMapper';

export async function fetchTaskPage(params: {
  projectType: ProjectType;
  limitValue: number;
  cursor?: QueryDocumentSnapshot | null;
}): Promise<{
  tasks: (Task & { projectType: ProjectType })[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
  snapshots: QueryDocumentSnapshot[];
}> {
  if (!db) {
    return { tasks: [], lastDoc: null, hasMore: false, snapshots: [] };
  }

  const baseRef = collection(db, 'projects', params.projectType, 'tasks');
  const constraints = params.cursor
    ? [orderBy('createdAt', 'desc'), startAfter(params.cursor), limit(params.limitValue)]
    : [orderBy('createdAt', 'desc'), limit(params.limitValue)];
  const snapshot = await getDocs(query(baseRef, ...constraints));

  const tasks = snapshot.docs.map((docItem) =>
    mapTaskDoc(docItem.id, docItem.data(), params.projectType)
  );
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  const hasMore = snapshot.docs.length === params.limitValue;

  return { tasks, lastDoc, hasMore, snapshots: snapshot.docs };
}

export async function fetchTaskByIdAcrossProjects(taskId: string): Promise<Task | null> {
  if (!db) return null;

  for (const projectType of PROJECT_TYPES) {
    const taskRef = doc(db, 'projects', projectType, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);
    if (taskDoc.exists()) {
      return mapTaskDoc(taskDoc.id, taskDoc.data(), projectType);
    }
  }
  return null;
}

export async function fetchAssignedOpenTasks(userId: string): Promise<(Task & { projectType: ProjectType })[]> {
  if (!db) return [];

  const allTasks: (Task & { projectType: ProjectType })[] = [];

  for (const projectType of PROJECT_TYPES) {
    const tasksRef = collection(db, 'projects', projectType, 'tasks');
    const tasksSnapshot = await getDocs(tasksRef);
    tasksSnapshot.docs.forEach((docItem) => {
      const taskData = mapTaskDoc(docItem.id, docItem.data(), projectType);
      if (taskData.assigneeIds.includes(userId) && taskData.flowStatus !== '完了') {
        allTasks.push(taskData);
      }
    });
  }

  return allTasks;
}
