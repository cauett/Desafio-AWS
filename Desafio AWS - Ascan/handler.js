'use strict';

// Importar a biblioteca AWS SDK para interagir com a AWS
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const uuid = require('uuid');

// Obter o nome da tabela de posts do ambiente
const postsTable = process.env.POSTS_TABLE;

// Função utilitária para retornar a resposta padrão
function response(statusCode, message) {
  return {
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}

// Função utilitária para ordenar os posts por data de criação
function sortByDate(a, b) {
  if (a.createdAt > b.createdAt) {
    return -1;
  }
  else {
    return 1;
  }
}

// Função para criar um novo post
module.exports.createPost = async (event, context, callback) => {
  const reqBody = JSON.parse(event.body);

  // Verificar se o título e o corpo do post estão presentes e não são vazios
  if (!reqBody.title || reqBody.title.trim() === '' || !reqBody.body || reqBody.body.trim() === '') {
    return callback(null, response(400, { error: 'O post deve ter um título e um corpo, não pode ser vazio' }));
  }

  // Criar o objeto do post com um ID gerado pelo UUID, data de criação atual, ID do usuário fixo, título e corpo do post
  const post = {
    id: uuid.v4(),
    createdAt: new Date().toISOString(),
    userId: 1,
    title: reqBody.title,
    body: reqBody.body
  };

  try {
    // Inserir o post na tabela do DynamoDB
    await db.put({
      TableName: postsTable,
      Item: post
    }).promise();
    
    return callback(null, response(201, post));
  } catch (err) {
    return callback(null, response(err.statusCode, err));
  }
};

// Função para obter todos os posts
module.exports.getAllPosts = (event, context, callback) => {
  return db.scan({
    TableName: postsTable
  }).promise().then(res => {
    // Ordenar os posts por data de criação e retornar a resposta com status 200
    callback(null, response(200, res.Items.sort(sortByDate)))
  }).catch(err => callback(null, response(err.statuscode, err)))
}

// Função para obter um número específico de posts
module.exports.getPosts = (event, context, callback) => {
  const numberOfPosts = event.pathParameters.number;
  const params = {
    TableName: postsTable,
    Limite: numberOfPosts
  };
  return db.scan(params)
  .promise()
  .then(res => {
    // Ordenar os posts por data de criação e retornar a resposta com status 200
    callback(null, response(200, res.Items.sort(sortByDate)))
  }).catch(err => callback(null, response(err.statuscode, err)))
}

// Função para obter um post específico pelo ID
module.exports.getPost = (event, context, callback) => {
  const id = event.pathParameters.ID;
  
  const params = {
    key: {
      id: id
    },
    TableName: postsTable
  }

  return db.get(params).promise()
  .then(res => {
    if (res.item) 
      callback(null, response(200, res.Item));
    else 
      callback(null, response(404, {error: 'Post não encontrado'}));
  })
  .catch(err => callback(null, response(err.statusCode, err)));
}

// Função para atualizar um post
module.exports.updatePost = (event, context, callback) => {
  const id = event.pathParameters.id;
  const body = JSON.parse(event.body);
  const paramName = body.paramName;
  const paramValue = body.paramValue;

  const params = {
    Key: {
      id: id
    },
    TableName: postsTable,
    ConditionExpression: 'attribute_exists(id)',
    UpdateExpression: 'set' + paramName + ' = :v',
    ExpressionAttributeValues: {
      ':v': paramValue
    },
    ReturnValue: 'ALL_NEW'
  };

  return db.update(params)
    .promise()
    .then(res => {
      callback(null, response(200, res));
    })
    .catch(err => callback(null, response(err.statusCode, err)));
}

// Função para deletar um post
module.exports.deletePost = (event, context, callback) => {
  const id = event.pathParameters.id;
  const params = {
    Key: {
      id: id
    },
    TableName: postsTable
  };
  return db.delete(params)
    .promise()
    .then(() => callback(null, response(200, {message: 'Post deletado com sucesso'})))
    .catch(err => callback(null, response(err.statusCode, err)));
}
