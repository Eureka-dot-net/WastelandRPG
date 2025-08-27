// async function updateCompletedTasksForSettler(settlerId: string) {
//   const now = new Date();
  
//   const tasksToComplete = await SettlerTask.find({
//     settlerId,
//     isRunning: true,
//     isCompleted: false,
//     completesAt: { $lte: now }
//   });

//   for (const task of tasksToComplete) {
//     task.isCompleted = true;
//     task.isRunning = false;

//     // Add rewards to inventory
//     await addRewardsToSettlerInventory(task.settlerId, task.rewards);

//     await task.save();
//   }

//   return tasksToComplete;
// }