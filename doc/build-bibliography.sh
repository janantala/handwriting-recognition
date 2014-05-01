#!/bin/bash
# LaTex build script
# on .bib file change

pdflatex -aux-directory="build" -output-directory="build" document
cp bibliography.bib build
cd build 
bibtex document
cd ..
pdflatex -aux-directory="build" -output-directory="build" document
pdflatex -aux-directory="build" -output-directory="build" document