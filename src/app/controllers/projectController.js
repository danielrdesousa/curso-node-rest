const express = require("express");
const authMiddleware = require("../middlewares/auth");

const Project = require('../models/Project');
const Task = require('../models/Task');


const router = express.Router();

router.use(authMiddleware);

router.get("/", async (request, response) => {
  try{
    // return all users and tasks information
    const projects = await Project.find().populate(['user', 'tasks']);

    return response.send({ projects });
  }catch{
    return response.status(400).send({error: 'Error loading projects'});
  }
});

router.get("/:projectId", async (request, response) => {
  try{
    const project = await Project.findById(request.params.projectId).populate('user');

    return response.send({ project });
  }catch{
    return response.status(400).send({error: 'Error loading this project'});
  }
});

router.post("/", async(request, response) => {
  try{
    const { title, description, tasks } = request.body;

    const project = await Project.create({ title, description, user: request.userId });

    // requires JS to wait for this execution
    await Promise.all(tasks.map(async task => {
      const projectTask = new Task({ ...task, project: project._id });
      
      await projectTask.save();
      
      project.tasks.push(projectTask);
    }));

    await project.save();

    return response.send(project);
  }catch{
    return response.status(400).send({error: 'Error creating new project'});
  }
});

router.put("/:projectId", async (request, response) => {
  try{
    const { title, description, tasks } = request.body;

    // new:true, returns the updated project
    const project = await Project.findByIdAndUpdate(request.params.projectId, {
      title,
      description
    }, { new: true });

    // remove all tasks
    project.tasks = [];
    await Task.remove({ project: project._id });

    // requires JS to wait for this execution
    await Promise.all(tasks.map(async task => {
      const projectTask = new Task({ ...task, project: project._id });
      
      await projectTask.save();
      
      project.tasks.push(projectTask);
    }));

    await project.save();

    return response.send(project);
  }catch{
    return response.status(400).send({error: 'Error creating new project'});
  }
});

router.delete("/:projectId", async (request, response) => {
  try{
    const tasks = await Task.remove({ project: request.params.projectId });
    const project = await Project.findByIdAndRemove(request.params.projectId);

    return response.send();
  }catch{
    return response.status(400).send({error: 'Error deleting project'});
  }
});


module.exports = app => app.use("/projects", router);
