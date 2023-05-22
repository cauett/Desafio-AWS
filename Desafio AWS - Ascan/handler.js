'use strict';

// Importar a biblioteca AWS SDK para interagir com a AWS
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
const uuid = require('uuid');

// Obter o nome da tabela de Pokémon do ambiente
const pokemonTable = process.env.POKEMON_TABLE;

// Função utilitária para retornar a resposta padrão
function response(statusCode, message) {
  return {
    statusCode: statusCode,
    body: JSON.stringify(message)
  };
}

// Função utilitária para ordenar os Pokémon por data de criação
function sortByDate(a, b) {
  if (a.createdAt > b.createdAt) {
    return -1;
  } else {
    return 1;
  }
}

// Função para criar um novo Pokémon
module.exports.createPokemon = async (event, context, callback) => {
  const reqBody = JSON.parse(event.body);

  // Verificar se o nome e o tipo do Pokémon estão presentes e não são vazios
  if (!reqBody.name || reqBody.name.trim() === '' || !reqBody.type || reqBody.type.trim() === '') {
    return callback(null, response(400, { error: 'O Pokémon deve ter um nome e um tipo, não pode ser vazio' }));
  }

  // Criar o objeto do Pokémon com um ID gerado pelo UUID, data de criação atual, nome e tipo do Pokémon
  const pokemon = {
    id: uuid.v4(),
    createdAt: new Date().toISOString(),
    id: reqBody.id,
    name: reqBody.name,
    type: reqBody.type
  };

  try {
    // Inserir o Pokémon na tabela do DynamoDB
    await db.put({
      TableName: pokemonTable,
      Item: pokemon
    }).promise();

    return callback(null, response(201, pokemon));
  } catch (err) {
    return callback(null, response(err.statusCode, err));
  }
};

// Função para obter todos os Pokémon
module.exports.getAllPokemon = (event, context, callback) => {
  return db.scan({
    TableName: pokemonTable
  })
    .promise()
    .then(res => {
      // Ordenar os Pokémon por data de criação e retornar a resposta com status 200
      callback(null, response(200, res.Items.sort(sortByDate)))
    })
    .catch(err => callback(null, response(err.statusCode, err)))
}

// Função para obter um número específico de Pokémon
module.exports.getPokemonByNumberOfPokemon = (event, context, callback) => {
  const numberOfPokemon = event.pathParameters.numberOfPokemon;
  const params = {
    TableName: pokemonTable,
    Limit: numberOfPokemon
  };
  return db.scan(params)
    .promise()
    .then(res => {
      // Ordenar os Pokémon por data de criação e retornar a resposta com status 200
      callback(null, response(200, res.Items.sort(sortByDate)))
    })
    .catch(err => callback(null, response(err.statusCode, err)))
}

// Função para obter um Pokémon específico pelo ID
module.exports.getPokemonById = (event, context, callback) => {
  const id = event.pathParameters.id;

  const params = {
    Key: {
      id: id
    },
    TableName: pokemonTable
  }

  return db.get(params)
    .promise()
    .then(res => {
      if (res.Item)
        callback(null, response(200, res.Item));
      else
        callback(null, response(404, { error: 'Pokémon não encontrado' }));
    })
    .catch(err => callback(null, response(err.statusCode, err)));
}

// Função para atualizar um Pokémon
module.exports.updatePokemon = (event, context, callback) => {
  const id = event.pathParameters.id;
  const body = JSON.parse(event.body);
  const paramName = body.paramName;
  const paramValue = body.paramValue;

  const params = {
    Key: {
      id: id
    },
    TableName: pokemonTable,
    ConditionExpression: 'attribute_exists(id)',
    UpdateExpression: 'set ' + paramName + ' = :v',
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

// Função para deletar um Pokémon
module.exports.deletePokemon = (event, context, callback) => {
  const id = event.pathParameters.id;
  const params = {
    Key: {
      id: id
    },
    TableName: pokemonTable
  };
  return db.delete(params)
    .promise()
    .then(() => callback(null, response(200, { message: 'Pokémon deletado com sucesso' })))
    .catch(err => callback(null, response(err.statusCode, err)));
}
